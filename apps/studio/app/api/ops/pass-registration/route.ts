import { NextResponse } from "next/server";
import { assignPass, listMembers, listPasses, saveMember, updateMember } from "@/lib/retroverse-pass/management";
export const dynamic = "force-dynamic";
export async function GET(req: Request) { const u=new URL(req.url); const type=u.searchParams.get("type")||"members"; const q=u.searchParams.get("q")||""; return NextResponse.json(type==="passes"?{passes:await listPasses(q)}:{members:await listMembers(q)}); }
export async function POST(req: Request) { const b=await req.json(); try { if(b.action==="assign") { await assignPass(b.serial,b.memberId??null); return NextResponse.json({ok:true}); } if(b.action==="update") { await updateMember(Number(b.id),b); return NextResponse.json({ok:true}); } return NextResponse.json({ok:true,id:await saveMember(b)}); } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Save failed"},{status:400}); } }
