import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { loginAction } from "../actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;
  if (await readSession()) {
    redirect("/");
  }

  return (
    <main className="login-page">
      <section className="login-box panel">
        <div className="panel-header">
          <h1 className="page-title">Entrar</h1>
        </div>
        <div className="card">
          <form className="form" action={loginAction}>
            {params.erro ? <div className="error">Senha invalida.</div> : null}
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input id="password" name="password" type="password" autoFocus required />
            </div>
            <button className="button" type="submit">
              Acessar painel
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
