import { NextResponse } from "next/server";
import { saveMember } from "@/lib/retroverse-pass/management";
export async function POST(req: Request) { try { const b=await req.json(); if(typeof b.firstName!=="string"||!b.firstName.trim()) return NextResponse.json({error:"First name is required."},{status:400}); const id=await saveMember(b); return NextResponse.json({ok:true,id}); } catch { return NextResponse.json({error:"Registration is temporarily unavailable."},{status:503}); } }
