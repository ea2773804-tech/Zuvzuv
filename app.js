 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/app.js b/app.js
new file mode 100644
index 0000000000000000000000000000000000000000..f057a303c2d965b94bd4c171f5c446ed0e682586
--- /dev/null
+++ b/app.js
@@ -0,0 +1,536 @@
+const STORAGE_KEY = "zuvzuv-state-v1";
+const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
+
+const defaultState = {
+  users: {},
+  session: null,
+  activeChatId: null,
+};
+
+let state = loadState();
+let authMode = "login";
+let selectedMedia = null;
+
+const appShell = document.querySelector(".app-shell");
+const authForm = document.querySelector("#auth-form");
+const authTitle = document.querySelector("#auth-mode-title");
+const authSubmit = document.querySelector("#auth-submit");
+const authMessage = document.querySelector("#auth-message");
+const toggleAuth = document.querySelector("#toggle-auth");
+const usernameInput = document.querySelector("#username");
+const passwordInput = document.querySelector("#password");
+const activeUserName = document.querySelector("#active-user-name");
+const logoutButton = document.querySelector("#logout-button");
+const newChatButton = document.querySelector("#new-chat-button");
+const settingsButton = document.querySelector("#settings-button");
+const chatSearch = document.querySelector("#chat-search");
+const chatList = document.querySelector("#chat-list");
+const chatTitle = document.querySelector("#chat-title");
+const chatSubtitle = document.querySelector("#chat-subtitle");
+const chatAvatar = document.querySelector("#chat-avatar");
+const messagesContainer = document.querySelector("#messages");
+const messageForm = document.querySelector("#message-form");
+const messageInput = document.querySelector("#message-input");
+const mediaInput = document.querySelector("#media-input");
+const mediaButton = document.querySelector("#media-button");
+const mediaPreview = document.querySelector("#media-preview");
+const newChatDialog = document.querySelector("#new-chat-dialog");
+const newChatForm = document.querySelector("#new-chat-form");
+const contactName = document.querySelector("#contact-name");
+const settingsDialog = document.querySelector("#settings-dialog");
+const settingsForm = document.querySelector("#settings-form");
+const displayName = document.querySelector("#display-name");
+const themeSelect = document.querySelector("#theme-select");
+const accentColor = document.querySelector("#accent-color");
+const notificationToggle = document.querySelector("#notification-toggle");
+const clearChatButton = document.querySelector("#clear-chat-button");
+
+function loadState() {
+  try {
+    return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
+  } catch {
+    return structuredClone(defaultState);
+  }
+}
+
+function saveState() {
+  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
+}
+
+function currentUser() {
+  return state.session ? state.users[state.session] : null;
+}
+
+function activeChat() {
+  const user = currentUser();
+  return user?.chats.find((chat) => chat.id === state.activeChatId) ?? null;
+}
+
+function createUser(username, password) {
+  state.users[username] = {
+    username,
+    password,
+    displayName: username,
+    settings: {
+      theme: "dark",
+      accent: "#7c3aed",
+      notifications: true,
+    },
+    chats: [
+      {
+        id: crypto.randomUUID(),
+        contact: "Equipe Zuvzuv",
+        createdAt: new Date().toISOString(),
+        messages: [
+          {
+            id: crypto.randomUUID(),
+            sender: "them",
+            author: "Equipe Zuvzuv",
+            text: "Bem-vindo! Crie uma conversa privada ou envie uma imagem/vídeo pelo botão de anexo.",
+            media: null,
+            createdAt: new Date().toISOString(),
+          },
+        ],
+      },
+    ],
+  };
+}
+
+function normalizeUsername(value) {
+  return value.trim().toLowerCase().replace(/\s+/g, "_");
+}
+
+function setScreen(screen) {
+  appShell.dataset.screen = screen;
+}
+
+function applySettings() {
+  const user = currentUser();
+  const settings = user?.settings ?? { theme: "dark", accent: "#7c3aed" };
+  document.documentElement.dataset.theme = settings.theme;
+  document.documentElement.style.setProperty("--accent", settings.accent);
+  activeUserName.textContent = user?.displayName ?? "Zuvzuv";
+}
+
+function render() {
+  const user = currentUser();
+
+  if (!user) {
+    setScreen("auth");
+    return;
+  }
+
+  setScreen("chat");
+  applySettings();
+
+  if (!state.activeChatId && user.chats.length > 0) {
+    state.activeChatId = user.chats[0].id;
+    saveState();
+  }
+
+  renderChatList();
+  renderConversation();
+}
+
+function renderChatList() {
+  const user = currentUser();
+  const query = chatSearch.value.trim().toLowerCase();
+  const chats = user.chats.filter((chat) => chat.contact.toLowerCase().includes(query));
+
+  chatList.innerHTML = "";
+
+  if (chats.length === 0) {
+    chatList.innerHTML = `<div class="empty-state">Nenhum chat encontrado.</div>`;
+    return;
+  }
+
+  chats.forEach((chat) => {
+    const lastMessage = chat.messages.at(-1);
+    const item = document.createElement("button");
+    item.type = "button";
+    item.className = `chat-item${chat.id === state.activeChatId ? " active" : ""}`;
+    item.setAttribute("role", "listitem");
+    item.innerHTML = `
+      <div class="avatar" aria-hidden="true">${escapeHtml(initials(chat.contact))}</div>
+      <div>
+        <strong>${escapeHtml(chat.contact)}</strong>
+        <span>${escapeHtml(lastMessage ? messageSummary(lastMessage) : "Conversa vazia")}</span>
+      </div>
+    `;
+    item.addEventListener("click", () => {
+      state.activeChatId = chat.id;
+      selectedMedia = null;
+      clearMediaPreview();
+      saveState();
+      render();
+    });
+    chatList.append(item);
+  });
+}
+
+function renderConversation() {
+  const chat = activeChat();
+
+  if (!chat) {
+    chatTitle.textContent = "Selecione ou crie uma conversa";
+    chatSubtitle.textContent = "Mensagens protegidas neste navegador.";
+    chatAvatar.textContent = "?";
+    messagesContainer.innerHTML = `<div class="empty-state">Clique em “Nova conversa privada” para começar.</div>`;
+    return;
+  }
+
+  chatTitle.textContent = chat.contact;
+  chatSubtitle.textContent = `${chat.messages.length} mensagem(ns) • criado em ${formatDate(chat.createdAt)}`;
+  chatAvatar.textContent = initials(chat.contact);
+  messagesContainer.innerHTML = "";
+
+  if (chat.messages.length === 0) {
+    messagesContainer.innerHTML = `<div class="empty-state">Envie a primeira mensagem privada.</div>`;
+    return;
+  }
+
+  chat.messages.forEach((message) => {
+    const article = document.createElement("article");
+    article.className = `message ${message.sender === "me" ? "me" : "them"}`;
+    article.innerHTML = `
+      <strong>${escapeHtml(message.author)}</strong>
+      <time datetime="${message.createdAt}">${formatDate(message.createdAt)}</time>
+      ${message.text ? `<p>${escapeHtml(message.text)}</p>` : ""}
+      ${renderMedia(message.media)}
+    `;
+    messagesContainer.append(article);
+  });
+
+  messagesContainer.scrollTop = messagesContainer.scrollHeight;
+}
+
+function renderMedia(media) {
+  if (!media) {
+    return "";
+  }
+
+  const safeSource = escapeAttribute(media.dataUrl);
+  const safeName = escapeAttribute(media.name);
+
+  if (media.type.startsWith("image/")) {
+    return `<img src="${safeSource}" alt="${safeName}" />`;
+  }
+
+  if (media.type.startsWith("video/")) {
+    return `<video src="${safeSource}" controls title="${safeName}"></video>`;
+  }
+
+  return "";
+}
+
+function addMessage(text, media = null) {
+  const user = currentUser();
+  const chat = activeChat();
+
+  if (!user || !chat) {
+    return;
+  }
+
+  chat.messages.push({
+    id: crypto.randomUUID(),
+    sender: "me",
+    author: user.displayName,
+    text,
+    media,
+    createdAt: new Date().toISOString(),
+  });
+
+  saveState();
+  render();
+
+  if (user.settings.notifications) {
+    notify(`Mensagem enviada para ${chat.contact}`);
+  }
+}
+
+function createPrivateChat(name) {
+  const user = currentUser();
+  const contact = name.trim();
+
+  if (!user || !contact) {
+    return;
+  }
+
+  const existingChat = user.chats.find((chat) => chat.contact.toLowerCase() === contact.toLowerCase());
+
+  if (existingChat) {
+    state.activeChatId = existingChat.id;
+  } else {
+    const newChat = {
+      id: crypto.randomUUID(),
+      contact,
+      createdAt: new Date().toISOString(),
+      messages: [],
+    };
+    user.chats.unshift(newChat);
+    state.activeChatId = newChat.id;
+  }
+
+  saveState();
+  render();
+}
+
+function setAuthMode(mode) {
+  authMode = mode;
+  const isLogin = mode === "login";
+  authTitle.textContent = isLogin ? "Entrar no Zuvzuv" : "Criar conta no Zuvzuv";
+  authSubmit.textContent = isLogin ? "Entrar" : "Criar conta";
+  toggleAuth.textContent = isLogin ? "Criar uma nova conta" : "Já tenho conta";
+  authMessage.textContent = "";
+}
+
+function clearMediaPreview() {
+  selectedMedia = null;
+  mediaInput.value = "";
+  mediaPreview.hidden = true;
+  mediaPreview.innerHTML = "";
+}
+
+function showMediaPreview(media) {
+  mediaPreview.hidden = false;
+  mediaPreview.innerHTML = `
+    <button class="icon-button remove-media" type="button" title="Remover mídia">×</button>
+    <strong>${escapeHtml(media.name)}</strong>
+    ${renderMedia(media)}
+  `;
+  mediaPreview.querySelector(".remove-media").addEventListener("click", clearMediaPreview);
+}
+
+function readMediaFile(file) {
+  return new Promise((resolve, reject) => {
+    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
+      reject(new Error("Selecione apenas imagem ou vídeo."));
+      return;
+    }
+
+    if (file.size > MAX_MEDIA_BYTES) {
+      reject(new Error("O arquivo precisa ter até 8 MB para salvar no navegador."));
+      return;
+    }
+
+    const reader = new FileReader();
+    reader.addEventListener("load", () => {
+      resolve({
+        name: file.name,
+        type: file.type,
+        size: file.size,
+        dataUrl: reader.result,
+      });
+    });
+    reader.addEventListener("error", () => reject(new Error("Não foi possível ler o arquivo.")));
+    reader.readAsDataURL(file);
+  });
+}
+
+function notify(message) {
+  const toast = document.createElement("div");
+  toast.textContent = message;
+  toast.style.cssText = `
+    position: fixed;
+    right: 1rem;
+    bottom: 1rem;
+    z-index: 20;
+    border-radius: 999px;
+    background: var(--accent);
+    color: white;
+    padding: 0.85rem 1rem;
+    box-shadow: var(--shadow);
+    font-weight: 800;
+  `;
+  document.body.append(toast);
+  setTimeout(() => toast.remove(), 2600);
+}
+
+function initials(name) {
+  return name
+    .trim()
+    .split(/\s+/)
+    .slice(0, 2)
+    .map((part) => part[0]?.toUpperCase() ?? "")
+    .join("") || "?";
+}
+
+function messageSummary(message) {
+  if (message.text) {
+    return message.text;
+  }
+
+  if (message.media?.type.startsWith("image/")) {
+    return "Imagem enviada";
+  }
+
+  if (message.media?.type.startsWith("video/")) {
+    return "Vídeo enviado";
+  }
+
+  return "Mensagem";
+}
+
+function formatDate(date) {
+  return new Intl.DateTimeFormat("pt-BR", {
+    dateStyle: "short",
+    timeStyle: "short",
+  }).format(new Date(date));
+}
+
+function escapeHtml(value) {
+  return String(value).replace(/[&<>'"]/g, (char) => ({
+    "&": "&amp;",
+    "<": "&lt;",
+    ">": "&gt;",
+    "'": "&#39;",
+    '"': "&quot;",
+  }[char]));
+}
+
+function escapeAttribute(value) {
+  return escapeHtml(value).replace(/`/g, "&#96;");
+}
+
+authForm.addEventListener("submit", (event) => {
+  event.preventDefault();
+  const username = normalizeUsername(usernameInput.value);
+  const password = passwordInput.value;
+  const user = state.users[username];
+
+  if (authMode === "register") {
+    if (user) {
+      authMessage.textContent = "Esse usuário já existe. Tente entrar.";
+      return;
+    }
+
+    createUser(username, password);
+    state.session = username;
+    state.activeChatId = state.users[username].chats[0].id;
+    saveState();
+    authForm.reset();
+    render();
+    return;
+  }
+
+  if (!user || user.password !== password) {
+    authMessage.textContent = "Usuário ou senha inválidos.";
+    return;
+  }
+
+  state.session = username;
+  state.activeChatId = user.chats[0]?.id ?? null;
+  saveState();
+  authForm.reset();
+  render();
+});
+
+toggleAuth.addEventListener("click", () => {
+  setAuthMode(authMode === "login" ? "register" : "login");
+});
+
+logoutButton.addEventListener("click", () => {
+  state.session = null;
+  state.activeChatId = null;
+  selectedMedia = null;
+  clearMediaPreview();
+  saveState();
+  render();
+});
+
+newChatButton.addEventListener("click", () => {
+  contactName.value = "";
+  newChatDialog.showModal();
+  contactName.focus();
+});
+
+settingsButton.addEventListener("click", () => {
+  const user = currentUser();
+  displayName.value = user.displayName;
+  themeSelect.value = user.settings.theme;
+  accentColor.value = user.settings.accent;
+  notificationToggle.checked = user.settings.notifications;
+  settingsDialog.showModal();
+});
+
+document.querySelectorAll("[data-close-dialog]").forEach((button) => {
+  button.addEventListener("click", () => button.closest("dialog").close());
+});
+
+newChatForm.addEventListener("submit", (event) => {
+  event.preventDefault();
+  createPrivateChat(contactName.value);
+  newChatDialog.close();
+});
+
+settingsForm.addEventListener("submit", (event) => {
+  event.preventDefault();
+  const user = currentUser();
+  user.displayName = displayName.value.trim();
+  user.settings.theme = themeSelect.value;
+  user.settings.accent = accentColor.value;
+  user.settings.notifications = notificationToggle.checked;
+  saveState();
+  settingsDialog.close();
+  render();
+});
+
+clearChatButton.addEventListener("click", () => {
+  const chat = activeChat();
+  if (!chat) {
+    return;
+  }
+
+  chat.messages = [];
+  saveState();
+  settingsDialog.close();
+  render();
+});
+
+chatSearch.addEventListener("input", renderChatList);
+
+mediaButton.addEventListener("click", () => mediaInput.click());
+
+mediaInput.addEventListener("change", async () => {
+  const file = mediaInput.files?.[0];
+
+  if (!file) {
+    clearMediaPreview();
+    return;
+  }
+
+  try {
+    selectedMedia = await readMediaFile(file);
+    showMediaPreview(selectedMedia);
+  } catch (error) {
+    clearMediaPreview();
+    notify(error.message);
+  }
+});
+
+messageInput.addEventListener("input", () => {
+  messageInput.style.height = "auto";
+  messageInput.style.height = `${messageInput.scrollHeight}px`;
+});
+
+messageForm.addEventListener("submit", (event) => {
+  event.preventDefault();
+  const text = messageInput.value.trim();
+
+  if (!activeChat()) {
+    notify("Crie uma conversa antes de enviar.");
+    return;
+  }
+
+  if (!text && !selectedMedia) {
+    notify("Digite uma mensagem ou selecione uma mídia.");
+    return;
+  }
+
+  addMessage(text, selectedMedia);
+  messageInput.value = "";
+  messageInput.style.height = "auto";
+  clearMediaPreview();
+});
+
+render();
 
EOF
)
