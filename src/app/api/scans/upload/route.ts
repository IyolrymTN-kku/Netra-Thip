import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/guards";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  sanitiseFilename,
  userUploadDir,
} from "@/lib/uploads/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guard = await requireRole([Role.ADMIN, Role.PENTESTER]);
  if (!guard.ok) return guard.response;
  const { session } = guard;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty file" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }
  const ext = path.extname(file.name).toLowerCase();
  const mimeOk = ALLOWED_UPLOAD_MIME.has(file.type);
  const extOk = ALLOWED_UPLOAD_EXTENSIONS.has(ext);
  if (!mimeOk && !extOk) {
    return NextResponse.json(
      { error: "unsupported file type" },
      { status: 415 },
    );
  }

  const dir = userUploadDir(session.user.id);
  await mkdir(dir, { recursive: true });
  const safeName = `${randomUUID()}-${sanitiseFilename(file.name)}`;
  const fullPath = path.join(dir, safeName);
  await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json(
    {
      path: path.relative(process.cwd(), fullPath).split(path.sep).join("/"),
      originalName: file.name,
      size: file.size,
    },
    { status: 201 },
  );
}
