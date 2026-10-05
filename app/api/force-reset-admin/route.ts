import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/actions/auth.actions';

export async function GET() {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'SYSTEM_ADMINISTRATOR' }
    });
    
    if (admins.length === 0) {
      return NextResponse.json({ success: false, message: 'No admin found' });
    }
    
    const admin = admins[0];
    const newPassword = 'Admin@123';
    const hash = await hashPassword(newPassword);
    
    await prisma.user.update({
      where: { id: admin.id },
      data: { 
        passwordHash: hash,
        isFirstLogin: false,
        activationCode: null
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `Admin ${admin.email} password reset successfully to Admin@123!` 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
