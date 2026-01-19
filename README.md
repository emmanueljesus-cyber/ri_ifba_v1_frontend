# RI-IFBA Frontend

Frontend do Sistema de Refeitório do IFBA, desenvolvido com Vue 3 + TypeScript + Vite.

## 🚀 Tecnologias

- **Vue 3** - Framework JavaScript progressivo
- **TypeScript** - Superset JavaScript com tipagem estática
- **Vite** - Build tool rápida
- **PrimeVue** - Biblioteca de componentes UI
- **Tailwind CSS** - Framework CSS utility-first
- **Pinia** - State management
- **Vue Router** - Roteamento
- **Axios** - Cliente HTTP

## 📋 Pré-requisitos

- Node.js 18+
- Yarn
- Backend rodando em `http://localhost:8000`

## 🔧 Instalação

1. Clone o repositório (se ainda não o fez)
2. Navegue até a pasta do frontend:
```bash
cd ri_ifba_v1_frontend
```

3. Instale as dependências:
```bash
yarn install
```

4. Configure as variáveis de ambiente:
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o .env e ajuste a URL da API se necessário
# VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## ▶️ Executando o Projeto

### Modo Desenvolvimento
```bash
yarn dev
```

O frontend estará disponível em `http://localhost:5173`

### Build de Produção
```bash
yarn build
```

### Preview do Build
```bash
yarn preview
```

## 🔑 Credenciais de Teste

### Admin
- Matrícula: `10000000001`
- Senha: `password123`

### Estudante Bolsista
- Matrícula: `20230001001`
- Senha: `password123`

### Estudante Não Bolsista
- Matrícula: `20230002001`
- Senha: `password123`

## 📁 Estrutura de Pastas

```
src/
├── assets/         # Estilos globais e assets
├── components/     # Componentes reutilizáveis
├── layouts/        # Layouts da aplicação
├── router/         # Configuração de rotas
├── services/       # Serviços e chamadas API
├── stores/         # Estado global (Pinia)
├── types/          # Tipos TypeScript
└── views/          # Páginas/Views
    └── auth/       # Telas de autenticação (Login, Cadastro)
```

## 🐛 Troubleshooting

### Erro de conexão ao fazer login
**Sintoma:** "Erro de conexão. Verifique se o backend está rodando."

**Solução:** 
1. Verifique se o backend está rodando em `http://localhost:8000`
2. Teste acessando `http://localhost:8000/api/v1/cardapio/hoje` no navegador
3. Verifique o arquivo `.env` e confirme que `VITE_API_BASE_URL` está correto

### Erro de CORS
**Sintoma:** Mensagens de erro sobre CORS no console do navegador

**Solução:**
1. Verifique se o backend está configurado corretamente para aceitar requisições do frontend
2. Confirme que o arquivo `config/cors.php` do Laravel está correto

### Primeicons não carrega
**Sintoma:** Ícones não aparecem

**Solução:**
```bash
yarn add primeicons
```

## 📝 Funcionalidades Implementadas

- ✅ Login de usuários (Admin e Estudantes)
- ✅ Cadastro de novos estudantes (não bolsistas)
- ✅ Autenticação com JWT via Sanctum
- ✅ Proteção de rotas
- ✅ Tratamento de erros
- 🚧 Dashboard (em desenvolvimento)
- 🚧 Perfil do usuário (em desenvolvimento)
- 🚧 Gestão de refeições (em desenvolvimento)

## 🔗 Links Úteis

- [Vue 3 Docs](https://vuejs.org/)
- [PrimeVue Docs](https://primevue.org/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [Pinia Docs](https://pinia.vuejs.org/)

