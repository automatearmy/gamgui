# Diagnóstico: Problema de Compartilhamento de Sessões Admin

## Resumo do Problema
As sessões de admin não estão sendo compartilhadas entre administradores. Cada admin só consegue ver suas próprias sessões, mesmo quando outras sessões admin estão ativas no sistema.

## Análise do Código

### Causa Raiz Identificada
O problema está na lógica de listagem de sessões no `SessionService.list_user_sessions()` e `SessionController.list_sessions()`. Atualmente, o sistema:

1. **Filtra sessões apenas por `user_id`**: O método `list_user_sessions()` retorna apenas sessões criadas pelo usuário específico
2. **Não considera o role do usuário**: Não há verificação se o usuário é admin para mostrar sessões de outros admins
3. **Não há diferenciação por `session_type`**: Embora o modelo tenha o campo `session_type` ("User" ou "Admin"), não há lógica para compartilhar sessões admin

### Arquivos Analisados

#### 1. `backend/models/session_model.py`
- ✅ Modelo possui campo `session_type` com valores "User" ou "Admin"
- ✅ Estrutura adequada para suportar compartilhamento

#### 2. `backend/services/session_service.py`
- ❌ `list_user_sessions()` filtra apenas por `user_id`
- ❌ Não considera role do usuário ou session_type
- ❌ Lógica atual: `sessions = await self.session_repository.get_by_user(user_id)`

#### 3. `backend/repositories/session_repository.py`
- ✅ Possui método `get_active_sessions()` que pode ser usado
- ❌ Não possui método para buscar sessões admin compartilhadas

#### 4. `backend/controllers/session_controller.py`
- ❌ `list_sessions()` chama apenas `list_user_sessions(user_id)`
- ❌ Não verifica se usuário é admin

#### 5. `backend/services/auth_service.py`
- ✅ Sistema de roles funciona corretamente
- ✅ Primeiro usuário vira "Admin", demais viram "User"

#### 6. `backend/models/user_model.py`
- ✅ Possui campo `role_id` para identificar admins

## Comportamento Atual vs Esperado

### Atual
- Admin A cria sessão admin → Apenas Admin A vê a sessão
- Admin B cria sessão admin → Apenas Admin B vê a sessão
- Usuários normais veem apenas suas próprias sessões

### Esperado
- Admin A cria sessão admin → Todos os admins veem a sessão
- Admin B cria sessão admin → Todos os admins veem a sessão
- Usuários normais veem apenas suas próprias sessões

## Soluções Propostas

### Solução 1: Modificar SessionService (Recomendada)
1. Adicionar método `list_sessions_for_user()` que:
   - Verifica se usuário é admin
   - Se admin: retorna todas as sessões admin + suas sessões user
   - Se user: retorna apenas suas próprias sessões

2. Modificar `SessionRepository` para suportar busca por session_type

### Solução 2: Criar endpoint específico para admins
1. Criar rota `/sessions/admin` para listar todas as sessões admin
2. Adicionar middleware para verificar role admin

### Solução 3: Modificar lógica existente
1. Alterar `list_user_sessions()` para aceitar parâmetro de role
2. Modificar controller para passar informação de role

## Impactos da Correção

### Positivos
- Admins poderão ver e gerenciar todas as sessões admin
- Melhor colaboração entre administradores
- Visibilidade completa do sistema para admins

### Considerações de Segurança
- Admins terão acesso a sessões de outros admins
- Necessário garantir que apenas admins tenham esse privilégio
- Logs de auditoria devem registrar acessos cross-user

## Correções Implementadas

### 1. SessionRepository (`backend/repositories/session_repository.py`)
- ✅ Adicionado método `get_admin_sessions()` para buscar todas as sessões admin

### 2. SessionService (`backend/services/session_service.py`)
- ✅ Modificado `list_user_sessions()` para aceitar parâmetro `user_role`
- ✅ Lógica implementada: se usuário é admin, inclui todas as sessões admin
- ✅ Modificado `get_session()` para permitir admins acessarem sessões admin de outros usuários
- ✅ Modificado `end_session()` para permitir admins encerrarem sessões admin de outros usuários

### 3. SessionController (`backend/controllers/session_controller.py`)
- ✅ Adicionado `UserRepository` para buscar role do usuário
- ✅ Modificado `list_sessions()` para buscar role e passar para o serviço
- ✅ Modificado `get_session()` para buscar role e passar para o serviço
- ✅ Modificado `end_session()` para buscar role e passar para o serviço

### 4. SocketIOController (`backend/controllers/socketio_controller.py`)
- ✅ Adicionado `UserRepository` para buscar role do usuário
- ✅ Modificado `connect_to_session()` para buscar role e passar para o serviço
- ✅ Corrigido problema onde WebSocket não considerava role do usuário

## Comportamento Após Correção

### Usuários Admin
- ✅ Veem suas próprias sessões (User e Admin)
- ✅ Veem todas as sessões Admin de outros admins
- ✅ Podem acessar detalhes de qualquer sessão Admin
- ✅ Podem encerrar qualquer sessão Admin

### Usuários Normais
- ✅ Veem apenas suas próprias sessões
- ✅ Não têm acesso a sessões de outros usuários

## Logs de Auditoria
- ✅ Sistema registra quando admin acessa sessão de outro usuário
- ✅ Sistema registra quando admin encerra sessão de outro usuário
- ✅ Logs incluem informações de role para rastreabilidade

## Próximos Passos
1. ✅ Implementar modificações no SessionRepository
2. ✅ Atualizar SessionService com nova lógica
3. ✅ Modificar SessionController para usar nova lógica
4. [ ] Testar funcionalidade com usuários admin e normais
5. [ ] Verificar logs de auditoria
6. [ ] Validar segurança da implementação
