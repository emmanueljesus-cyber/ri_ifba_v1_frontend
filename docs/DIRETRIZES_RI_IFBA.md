# Diretrizes de Desenvolvimento - RI-IFBA Frontend

## Visão Geral
Este documento define os padrões de desenvolvimento para o frontend do sistema de Refeitório Institucional do IFBA (RI-IFBA). O objetivo é garantir um código limpo, modular, acessível e com estética profissional.

## Stack Tecnológica
- **Framework**: Vue 3 (Composition API com TypeScript)
- **UI Library**: PrimeVue 4 (Aura theme)
- **Styling**: Tailwind CSS 3.4
- **State Management**: Pinia
- **Router**: Vue Router

## 1. Identidade Visual e Estilização

### Paleta de Cores
O projeto utiliza uma paleta de verdes sóbrios, alinhada à identidade do IFBA.
- `primary`: Variáveis `--p-primary-X` no `main.css`. Use as classes Tailwind `text-primary-600`, `bg-primary-50`, etc.
- `surface`: Cores de fundo e superfícies (cinzas do Slate).
- `ifba-verde`: `#248c35` (cor principal da marca).

### Tipografia
- Fonte principal: **Lato**.
- Use as classes utilitárias:
  - `lato-black` (font-weight 900) para títulos de seções.
  - `lato-bold` (font-weight 700) para sublinhados e destaques.
  - `font-medium` ou `font-bold` para textos importantes.

### Espaçamentos e Bordas
- Use arredondamentos generosos: `rounded-2xl` (1rem) para botões e `rounded-3xl` (1.5rem) para cards principais.
- Espaçamento consistente: Use múltiplos de 4 (`p-4`, `m-6`, `gap-2`).

## 2. Componentização

### Modularidade
- Crie componentes pequenos e focados.
- Componentes comuns (headers, botões customizados) devem ficar em `src/components/common`.

### PageHeader
Sempre utilize o componente `PageHeader` para os títulos das páginas. Ele garante consistência nos breadcrumbs e no estilo dos títulos.
```vue
<PageHeader
  title="Título da Página"
  subtitle="Descrição opcional"
  :breadcrumbs="[{ label: 'Home', route: '/' }, { label: 'Atual' }]"
/>
```

## 3. Convenções de Código

### Nomeação
- Variáveis e funções em **português**.
- Sufixos/Prefixos técnicos em inglês são permitidos (`handle`, `use`, `Store`, `get`, `set`).
- Exemplo: `handleFecharModal`, `useUsuarioStore`, `getInscricoes`.

### Estrutura de Arquivos .vue
1. `<script setup lang="ts">`
2. `<template>`
3. `<style scoped>` (tente evitar ao máximo, preferindo Tailwind).

## 4. UX/UI de "Interface Profissional"
- **Feedback**: Sempre use `loading` states com `Skeleton` ou `ProgressSpinner`.
- **Transições**: Adicione `transition-all` em elementos interativos.
- **Sombras**: Use sombras suaves (`shadow-sm`) e aumente no hover para cards clicáveis.
- **Modo Escuro**: Prepare o código com classes `dark:`, utilizando as superfícies do PrimeVue.

## 5. Assets
- Utilize apenas SVGs ou imagens otimizadas em `src/assets/image`.
- Evite placeholders inline.

---
**Última atualização**: Janeiro 2026
