import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('dairy-flat-airline');
    const collections = await db.listCollections().toArray();
    return NextResponse.json({ success: true, collections });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      code: error.code,
      stack: error.stack
    }, { status: 500 });
  }
}