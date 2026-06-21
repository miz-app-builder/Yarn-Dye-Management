import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { supabaseAdmin } from "../lib/supabaseAdmin";

const router: IRouter = Router();

const SignupBody = z.object({
  email: z.email(),
  password: z.string().min(6),
});

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.post("/auth/signup", async (req: Request, res: Response): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password (min 6 characters)" });
    return;
  }

  const { email, password } = parsed.data;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    const status = error.message?.toLowerCase().includes("already") ? 409 : 400;
    res.status(status).json({ error: error.message });
    return;
  }

  res.status(201).json({ id: data.user.id, email: data.user.email });
});

export default router;
