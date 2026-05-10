# Zuvzuv
 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/README.md b/README.md
index f735ffebe796a89a03f91762e3129c51fbe9b090..e0b6a4771477d753d294800a3cd3396248b9bcfc 100644
--- a/README.md
+++ b/README.md
@@ -1,2 +1,25 @@
 # Zuvzuv
-bem vindo ao Zuvzuv um site para voce explorar e descobrir coisas aleatorias dele.
+
+Zuvzuv é um site de conversas privadas feito em HTML, CSS e JavaScript puro.
+
+## Funcionalidades
+
+- Login e criação de conta local no navegador.
+- Criação de chats de conversa privada.
+- Envio de mensagens de texto.
+- Seleção e envio de imagem ou vídeo do dispositivo.
+- Barra de digitação com pré-visualização de mídia.
+- Configurações de nome exibido, tema, cor de destaque e notificações.
+- Persistência em `localStorage` para manter contas, chats e mensagens entre recarregamentos.
+
+> Observação: esta versão é funcional no navegador para demonstração local. Como não há servidor ou banco de dados remoto, as conversas ficam salvas somente no navegador/dispositivo usado.
+
+## Como executar
+
+Abra o arquivo `index.html` diretamente no navegador ou rode um servidor local:
+
+```bash
+python3 -m http.server 4173
+```
+
+Depois acesse `http://localhost:4173`.
 
EOF
)
