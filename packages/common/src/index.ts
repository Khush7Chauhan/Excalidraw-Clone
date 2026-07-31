import { z } from "zod";

export const signupSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    name: z.string().min(2, { message: "Name is too short" })
});

export const signinSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

export const CreateRoomSchema = z.object({
    slug: z.string().min(3, { message: "Room name must be at least 3 characters" }).max(20)
});

export const CreateUserSchema = signupSchema;
export const SigninSchema = signinSchema;

export type SignupType = z.infer<typeof signupSchema>;
export type SigninType = z.infer<typeof signinSchema>;
export type CreateRoomType = z.infer<typeof CreateRoomSchema>;
export type CreateUserType = SignupType;