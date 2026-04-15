import { NextResponse } from 'next/server'
import { createToken, setAuthCookie } from '@/lib/auth'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    // Validate against env credentials
    const adminEmail    = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { success: false, error: 'Admin credentials not configured' },
        { status: 500 }
      )
    }

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create JWT token
    const token = await createToken({
      email,
      role: 'admin',
    })

    const response = NextResponse.json({ success: true })
    setAuthCookie(response, token)
    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
