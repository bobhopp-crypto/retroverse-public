#!/usr/bin/env python3
"""Transfer private pass records from Neon into existing Redis; print counts only."""
import json
import os
import subprocess
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
pg_env['PGSSLMODE'] = 'require'

def query(sql):
    result = subprocess.run(['psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql],
                            env=pg_env, capture_output=True, check=True, timeout=120)
    return [json.loads(line) for line in result.stdout.splitlines() if line]

with tempfile.TemporaryDirectory(prefix='retroverse-pass-transfer-') as d:
    path = Path(d) / 'env'
    pulled = subprocess.run(['vercel', 'env', 'pull', str(path), '--environment=production', '--yes'],
                            cwd=root, capture_output=True, text=True, timeout=45)
    if pulled.returncode:
        raise RuntimeError('Unable to load Redis environment')
    redisvars = parse_env(path)
    url = redisvars.get('LIVE_KV_REST_API_URL')
    token = redisvars.get('LIVE_KV_REST_API_TOKEN')
    if not url or not token:
        raise RuntimeError('Connected Redis credentials missing')

    def redis(args):
        request = urllib.request.Request(url, data=json.dumps(args, separators=(',', ':')).encode(),
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(request, timeout=30) as response:
            answer = json.load(response)
        if 'error' in answer:
            raise RuntimeError('Redis command failed')
        return answer.get('result')

    passes = query('SELECT row_to_json(t) FROM (SELECT serial, claimed, visitor_id, claimed_at FROM retroverse_passes ORDER BY serial) t')
    visitors = query('SELECT row_to_json(t) FROM (SELECT id, first_name, last_name, email, phone, birthday, postal_code, marketing_opt_in, notes, created_at FROM retroverse_visitors ORDER BY id) t')
    activity = query('SELECT row_to_json(t) FROM (SELECT id, visitor_id, pass_serial, event_type, metadata, created_at FROM retroverse_pass_activity ORDER BY id) t')
    registrations = query('SELECT row_to_json(t) FROM (SELECT id, pass_number, first_name, last_name, email, created_at FROM collector_pass_registrations ORDER BY id) t')
    if len(passes) < 80 or len(visitors) < 71 or len(activity) < 346 or len(registrations) < 5:
        raise RuntimeError('Pass export smaller than verified backup counts')

    base = 'rv:pass:'
    keys = {'passes': base+'passes:v1', 'visitors': base+'visitors:v1', 'activity': base+'activity:v1',
            'registrations': base+'collector-registrations:v1', 'nextVisitor': base+'next-visitor-id:v1',
            'nextActivity': base+'next-activity-id:v1', 'nextRegistration': base+'next-registration-id:v1'}
    if any(int(redis(['HLEN', keys[name]]) or 0) for name in ('passes', 'visitors', 'registrations')) or int(redis(['LLEN', keys['activity']]) or 0):
        raise RuntimeError('Pass destination already contains records; refusing to overwrite')

    def encoded(value): return json.dumps(value, separators=(',', ':'), ensure_ascii=False)
    def iso(value): return value.replace(' ', 'T').replace('+00:00', 'Z') if value else None
    pass_args = ['HSET', keys['passes']]
    for row in passes:
        pass_args += [row['serial'], encoded({'serial': row['serial'], 'claimed': row['claimed'],
            'visitorId': row['visitor_id'], 'claimedAt': iso(row['claimed_at']),
            'status': 'registered' if row['claimed'] else 'never_registered'})]
    redis(pass_args)
    visitor_args = ['HSET', keys['visitors']]
    for row in visitors:
        visitor_args += [str(row['id']), encoded({'id': row['id'], 'firstName': row['first_name'],
            'lastName': row['last_name'], 'email': row['email'], 'phone': row['phone'],
            'birthday': str(row['birthday']) if row['birthday'] else None, 'postalCode': row['postal_code'],
            'marketingOptIn': row['marketing_opt_in'], 'notes': row['notes'], 'createdAt': iso(row['created_at'])})]
    redis(visitor_args)
    for start in range(0, len(activity), 100):
        args = ['RPUSH', keys['activity']]
        for row in activity[start:start+100]:
            args.append(encoded({'id': row['id'], 'visitorId': row['visitor_id'], 'passSerial': row['pass_serial'],
                'eventType': row['event_type'], 'metadata': row['metadata'], 'createdAt': iso(row['created_at'])}))
        redis(args)
    registration_args = ['HSET', keys['registrations']]
    for row in registrations:
        registration_args += [row['pass_number'], encoded({'id': row['id'], 'passNumber': row['pass_number'],
            'firstName': row['first_name'], 'lastName': row['last_name'], 'email': row['email'],
            'createdAt': iso(row['created_at'])})]
    redis(registration_args)
    redis(['SET', keys['nextVisitor'], max(row['id'] for row in visitors)])
    redis(['SET', keys['nextActivity'], max(row['id'] for row in activity)])
    redis(['SET', keys['nextRegistration'], max(row['id'] for row in registrations)])
    counts = (int(redis(['HLEN', keys['passes']])), int(redis(['HLEN', keys['visitors']])),
              int(redis(['LLEN', keys['activity']])), int(redis(['HLEN', keys['registrations']])))
    if counts != (len(passes), len(visitors), len(activity), len(registrations)):
        raise RuntimeError('Pass destination count mismatch')
    print(f'pass data transferred and verified: {counts[0]} passes, {counts[1]} visitors, {counts[2]} actions, {counts[3]} registrations')
