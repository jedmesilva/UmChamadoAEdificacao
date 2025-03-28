# UM CHAMADO À EDIFICAÇÃO

Uma plataforma espiritual que fornece cartas semanais de edificação e crescimento pessoal. A plataforma permite que os usuários se inscrevam para receber conteúdo espiritual regularmente e oferece acesso a cartas já publicadas através de uma interface amigável.

## Funcionalidades

- 📝 Sistema de inscrição por e-mail para receber cartas semanais
- 🔒 Autenticação de usuários para acesso a conteúdo protegido
- 📚 Visualização de cartas espirituais em formato amigável
- 📊 Rastreamento automático de status de leitura
- 📱 Design responsivo para acesso em qualquer dispositivo

## Tecnologias Utilizadas

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Express.js, Node.js
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Gerenciamento de Estado**: TanStack Query (React Query)
- **Formulários**: React Hook Form com validação Zod

## Configuração do Projeto

### Pré-requisitos

- Node.js (versão 18.x ou superior)
- npm ou yarn
- Conta no Supabase (para armazenamento e autenticação)

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_supabase
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_supabase
```

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/Jedmesilva/um-chamado-a-edificacao.git
cd um-chamado-a-edificacao
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

4. Acesse o aplicativo em `http://localhost:5000`

## Estrutura do Banco de Dados

O aplicativo utiliza as seguintes tabelas no Supabase:

- `account_user`: Informações dos usuários
- `cartas_um_chamado_a_edificacao`: Cartas espirituais publicadas
- `subscription_um_chamado`: Inscrições para receber conteúdo
- `status_carta`: Registro de leitura das cartas pelos usuários

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests para melhorar este projeto.

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.