import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: get current customer profile (auto-creates if missing)
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ profile: null });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ profile: null });
  }

  // Find or create customer record
  let customer = await db.customer.findUnique({
    where: { supabaseUserId: user.id },
  });

  if (!customer) {
    // Try email-based fallback merge
    customer = await db.customer.findUnique({
      where: { email: user.email || "" },
    });
    if (customer) {
      customer = await db.customer.update({
        where: { id: customer.id },
        data: { supabaseUserId: user.id },
      });
    } else {
      customer = await db.customer.create({
        data: {
          supabaseUserId: user.id,
          email: user.email || "",
          name: (user.user_metadata?.full_name as string) || null,
          phone: (user.user_metadata?.phone as string) || null,
        },
      });
    }
  }

  return NextResponse.json({
    profile: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
    },
  });
}

// PATCH: update customer profile
export async function PATCH(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) data.name = String(body.name).slice(0, 100);
  if (body.phone !== undefined) {
    // Indian mobile normalization
    let phone = String(body.phone).replace(/\D/g, "");
    if (phone.length === 12 && phone.startsWith("91")) phone = phone.slice(2);
    if (phone.length === 11 && phone.startsWith("0")) phone = phone.slice(1);
    if (/^[6-9]\d{9}$/.test(phone)) {
      data.phone = `+91 ${phone}`;
    }
  }

  const customer = await db.customer.update({
    where: { supabaseUserId: user.id },
    data,
  });

  // Sync to Supabase user_metadata
  if (body.name || body.phone) {
    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        full_name: data.name || customer.name || "",
        phone: data.phone || customer.phone || "",
      },
    });
  }

  return NextResponse.json({
    profile: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
    },
  });
}
