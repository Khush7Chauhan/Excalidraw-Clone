import { z } from "zod";

export const signupSchema = z.object({
    email: z.string().email({message:"Invalid Email address"}),
    password: z.string().min(6, {message:"Password must be 6 characters"}),
    name: z.string().min(2, {message:"Name is too short"})
});

export const signinSchema = z.object({
    email: z.string().email(),
    password: z.string()
});

export const CreateRoomSchema = z.object({
    slug: z.string().min(3,{message:"Room name must be atleast 3 characters"}).max(20)
});

export type SignupType = z.infer<typeof signupSchema>;
export type SigninType = z.infer<typeof signinSchema>;
export type CreateRoomType = z.infer<typeof CreateRoomSchema>;