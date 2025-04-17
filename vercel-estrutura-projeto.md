# Estrutura do Projeto para Vercel

## Visão Geral

Esta aplicação é uma **aplicação React** criada com Vite e possui uma estrutura híbrida com:

1. Uma interface de usuário React (frontend)
2. APIs serverless (para funções específicas)

O problema de implantação estava relacionado à incompatibilidade entre essa estrutura híbrida e a configuração do Vercel, que anteriormente estava configurada para um aplicativo Node.js puro (backend).

## Arquitetura Correta

```
Aplicação React (Frontend Static Site)
├── src/                  # Código React
│   ├── components/       # Componentes React
│   ├── hooks/            # Hooks personalizados
│   └── ...               # Outros arquivos React
│
└── api/                  # Funções serverless
    └── *.js              # Endpoints API
```

## Principais Componentes

1. **Interface React (Frontend)**
   - Construída com Vite
   - Localizada principalmente em `/src` e `/client/src`
   - Deve ser compilada para arquivos estáticos (HTML/CSS/JS)

2. **Funções Serverless (API)**
   - Localizadas em `/api`
   - Executadas como funções serverless no Vercel
   - Não são parte da aplicação React em si, mas complementam a funcionalidade

## Configuração Correta do Vercel

Para implantar corretamente esta aplicação, o Vercel deve ser configurado para:

1. **Reconhecer o frontend como uma aplicação Vite**
   - Usar o framework preset correto (Vite)
   - Compilar o código React em arquivos estáticos

2. **Tratar a pasta `/api` como funções serverless**
   - Executar cada arquivo `.js` como uma função independente
   - Rotear solicitações `/api/*` para as funções correspondentes

3. **Gerenciar corretamente o roteamento do lado do cliente**
   - Redirecionar todas as solicitações não-API para o `index.html`
   - Permitir que o React Router (ou similar) manipule o roteamento do lado do cliente

## Mudanças Realizadas

1. **Atualização do `vercel.json`**
   - Configuração para aplicativo React (static site) em vez de Node.js backend
   - Configuração correta de rotas e manipuladores

2. **Script de Preparação**
   - `prepare-build.js` garante que os arquivos estejam na estrutura correta
   - Sincroniza arquivos entre `client/src` e `src`

3. **Documentação**
   - Guias detalhados para implantação
   - Estrutura do projeto explicada