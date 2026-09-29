#!/usr/bin/env python3
"""Transfer small event and giveaway state records from Neon to existing Redis."""
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[2]

def parse_env(path):
    result = {}
    for line in Path(path).read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            key, value = line.split('=', 1)
            result[key] = value.strip().strip('"').strip("'")
    return result

pgvars = parse_env('/Users/bobhopp/RETROVERSE_PUBLIC/.env.local')
pg_env = os.environ.copy()
for suffix in ('HOST', 'PORT', 'DATABASE', 'USER', 'PASSWORD'):
    pg_env['PG' + suffix] = pgvars['RETROVERSE_PASS_PG_' + suffix]
pg_env['PGSSLMODE'] = 'require' if pgvars.get('RETROVERSE_PASS_PG_SSL') != '0' else 'disable'
query = """
SELECT row_to_json(x) FROM (
 SELECT key,value FROM sunday_nights_state
 WHERE key LIKE 'eventControl%' OR key LIKE 'eventMode%'
    OR key LIKE 'eventStudioGiveaway%'
 ORDER BY key
) x
"""
result = subprocess.run(['psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query],
                        env=pg_env, capture_output=True, check=True, timeout=120)
records = [json.loads(line) for line in result.stdout.splitlines() if line]
if len(records) < 3 or len(records) > 20:
    raise RuntimeError('Small public state count outside expected bounds')

with tempfile.TemporaryDirectory(prefix='retroverse-state-transfer-') as folder:
    path = Path(folder) / 'env'
    pulled = subprocess.run(['vercel', 'env', 'pull', str(path), '--environment=production', '--yes'],
                            cwd=root, capture_output=True, text=True, timeout=45)
    if pulled.returncode:
        raise RuntimeError('Unable to load existing Redis environment')
    redisvars = parse_env(path)
    url = redisvars.get('LIVE_KV_REST_API_URL')
    token = redisvars.get('LIVE_KV_REST_API_TOKEN')
    if not url or not token:
        raise RuntimeError('Connected Redis credentials missing')

    def redis(args):
        req = urllib.request.Request(url, data=json.dumps(args, separators=(',', ':')).encode(),
            headers={'Authorization': 'Bearer '+token, 'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, timeout=30) as response:
            answer = json.load(response)
        if 'error' in answer:
            raise RuntimeError('Redis command failed')
        return answer.get('result')

    for record in records:
        key = 'rv:public-state:v1:' + record['key']
        serialized = json.dumps(record['value'], separators=(',', ':'))
        prior = redis(['GET', key])
        refresh = '--refresh-before-cutover' in sys.argv
        if prior is not None and json.loads(prior) != record['value'] and not refresh:
            raise RuntimeError('Destination state already differs; refusing to overwrite')
        if (prior is None or refresh) and redis(['SET', key, serialized]) != 'OK':
            raise RuntimeError('State write was not acknowledged')
        saved = redis(['GET', key])
        if saved is None or json.loads(saved) != record['value']:
            raise RuntimeError('State verification failed')
    print(f'transferred and verified {len(records)} small public state records')
