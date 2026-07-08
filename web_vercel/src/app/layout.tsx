import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { readSession } from "@/lib/auth";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Assistente de Transporte",
  description: "Gestao de pedidos e careacoes"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {session ? (
          <div className="shell">
            <aside className="sidebar">
              <Link className="brand" href="/">
                Assistente de Transporte
              </Link>
              <nav className="nav">
                <Link href="/">Resumo</Link>
                <Link href="/upload">Upload de planilha</Link>
                <Link href="/pedidos">Pendencias</Link>
                <Link href="/careacoes">Careacoes</Link>
                <Link href="/importacoes">Importacoes e erros</Link>
                <Link href="/relatorios">Relatorios</Link>
              </nav>
              <form action={logoutAction}>
                <button className="link-button" type="submit">
                  Sair
                </button>
              </form>
            </aside>
            <main className="main">
              <div className="container">{children}</div>
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
