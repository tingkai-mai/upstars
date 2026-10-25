"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const router = useRouter();

    async function go(mode: "in" | "up") {
        const res = mode === "in"
            ? await authClient.signIn.email({ email, password })
            : await authClient.signUp.email({ email, password, name: email });
        if (res.error) setErr(res.error.message ?? "Failed");
        else router.push("/syllabus");
    }

    return (
        <div className="mx-auto mt-24 flex max-w-sm flex-col gap-2">
            <input className="border p-2" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="border p-2" type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="border p-2" onClick={() => go("in")}>Sign in</button>
            <button className="border p-2" onClick={() => go("up")}>Sign up</button>
            {err && <p className="text-red-600">{err}</p>}
        </div>
    );
}