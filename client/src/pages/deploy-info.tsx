import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CheckCircle, ExternalLink, Github } from "lucide-react";

export default function DeployInfo() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl md:text-3xl font-bold">
            Deploy na Vercel - Guia Rápido
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Configuração concluída!
            </h2>
            <p className="text-gray-700">
              Seu projeto está configurado para ser implantado corretamente na Vercel
              como uma aplicação frontend, com as seguintes otimizações:
            </p>
            
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>
                <strong>vercel.json</strong> - Configuração especializada para Vercel
              </li>
              <li>
                <strong>vercel-build.js</strong> - Script de build personalizado
              </li>
              <li>
                <strong>vite.frontend.config.ts</strong> - Configuração do Vite otimizada
              </li>
              <li>
                <strong>.vercelignore</strong> - Arquivos ignorados no deploy
              </li>
            </ul>
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="text-xl font-semibold">Passos para o Deploy</h2>
            
            <ol className="list-decimal pl-5 space-y-3 text-gray-700">
              <li>
                <p><strong>Crie uma conta na Vercel</strong></p>
                <p className="text-sm text-gray-600">Se ainda não tiver, registre-se em vercel.com</p>
              </li>
              <li>
                <p><strong>Envie seu código para um repositório Git</strong></p>
                <p className="text-sm text-gray-600">GitHub, GitLab ou Bitbucket</p>
              </li>
              <li>
                <p><strong>Importe o repositório na Vercel</strong></p>
                <p className="text-sm text-gray-600">Use o botão "Add New" e depois "Project" no painel da Vercel</p>
              </li>
              <li>
                <p><strong>Configure as variáveis de ambiente</strong></p>
                <p className="text-sm text-gray-600">
                  Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
                </p>
              </li>
              <li>
                <p><strong>Clique em "Deploy"</strong></p>
                <p className="text-sm text-gray-600">A Vercel usará automaticamente suas configurações personalizadas</p>
              </li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link href="/">
              <Button variant="outline" className="w-full sm:w-auto">
                Voltar ao site
              </Button>
            </Link>
            <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer">
              <Button className="w-full sm:w-auto flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Ir para Vercel
              </Button>
            </a>
            <a href="https://github.com/new" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" className="w-full sm:w-auto flex items-center gap-2">
                <Github className="h-4 w-4" />
                Criar Repositório
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}