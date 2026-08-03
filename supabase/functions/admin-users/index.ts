import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers: CORS_HEADERS })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!

    const clientUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: caller }, error: userErr } = await clientUser.auth.getUser()
    if (userErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS_HEADERS })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, is_active")
      .eq("id", caller.id)
      .single()

    if (!profile || profile.role !== "admin" || profile.is_active === false) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), { status: 403, headers: CORS_HEADERS })
    }

    const body = await req.json()
    const { action, id, email, username, full_name, password, role, phone, department, is_temporary, expires_at, features, is_active, avatar_url } = body

    if (action === "create") {
      if (!email || !username || !full_name) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: CORS_HEADERS })
      }

      const passToUse = password && password.length >= 8 ? password : generateTempPassword()

      const { data: newAuthUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: passToUse,
        email_confirm: true,
        user_metadata: { full_name, username }
      })
      if (createErr) throw createErr

      const userId = newAuthUser.user.id
      const { data: newProfile, error: profErr } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          email,
          username,
          full_name,
          role: role || "user",
          phone,
          department,
          is_temporary: !!is_temporary,
          expires_at: expires_at || null,
          features: features || {},
          is_active: is_active !== false,
          avatar_url: avatar_url || null
        })
        .select()
        .single()

      if (profErr) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
        throw profErr
      }

      return new Response(JSON.stringify({ ...newProfile, tempPassword: passToUse !== password ? passToUse : null }), { status: 201, headers: CORS_HEADERS })
    }

    if (action === "update") {
      if (!id) return new Response(JSON.stringify({ error: "Missing user id" }), { status: 400, headers: CORS_HEADERS })

      const authUpdates: any = {}
      if (email) authUpdates.email = email
      if (password && password.length >= 8) authUpdates.password = password

      if (Object.keys(authUpdates).length) {
        const { error: aErr } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates)
        if (aErr) throw aErr
      }

      const profileUpdates: any = {}
      if (email !== undefined) profileUpdates.email = email
      if (username !== undefined) profileUpdates.username = username
      if (full_name !== undefined) profileUpdates.full_name = full_name
      if (avatar_url !== undefined) profileUpdates.avatar_url = avatar_url || null
      if (role !== undefined) profileUpdates.role = role
      if (phone !== undefined) profileUpdates.phone = phone
      if (department !== undefined) profileUpdates.department = department
      if (is_temporary !== undefined) profileUpdates.is_temporary = !!is_temporary
      if (expires_at !== undefined) profileUpdates.expires_at = expires_at || null
      if (is_active !== undefined) profileUpdates.is_active = !!is_active
      if (features !== undefined) profileUpdates.features = features

      const { data: updatedProfile, error: pErr } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", id)
        .select()
        .single()

      if (pErr) throw pErr

      return new Response(JSON.stringify(updatedProfile), { status: 200, headers: CORS_HEADERS })
    }

    if (action === "delete") {
      if (!id) return new Response(JSON.stringify({ error: "Missing user id" }), { status: 400, headers: CORS_HEADERS })

      const { error: dAuthErr } = await supabaseAdmin.auth.admin.deleteUser(id)
      if (dAuthErr) throw dAuthErr

      const { error: dProfErr } = await supabaseAdmin.from("profiles").delete().eq("id", id)
      if (dProfErr) throw dProfErr

      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS_HEADERS })
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: CORS_HEADERS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: CORS_HEADERS })
  }
})

function generateTempPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!&*"
  let pwd = ""
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pwd
}
