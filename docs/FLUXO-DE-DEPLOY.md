# Fluxo seguro de desenvolvimento e deploy

O Portabilidade PRO utiliza validação automática antes que alterações sejam integradas à branch principal.

## Fluxo

1. Criar uma branch a partir da `main`.
2. Realizar e testar as alterações.
3. Fazer commit e enviar a branch ao GitHub.
4. Abrir um Pull Request para a `main`.
5. Aguardar as verificações:
   - Frontend Build
   - Backend Syntax
6. Fazer o merge somente após todos os testes serem aprovados.
7. O EasyPanel realiza o deploy a partir da `main`.

## Regra importante

Não enviar alterações diretamente para a branch `main`.
