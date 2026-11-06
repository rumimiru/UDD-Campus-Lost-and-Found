const STORAGE_KEY = "stepsLostFoundData_v1";
const SESSION_KEY = "stepsLostFoundSession_v1";
const THEME_KEY = "stepsTheme";
const CONTACT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$|^https?:\/\/\S+$/i;

let state = { users: [], items: [], requests: [], notifications: [], currentUser: null };
let activeItemId = null;
let activeView = "dashboard";
let toastTimer = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const makeId = () => crypto.randomUUID();
const initials = name => String(name || "Guest").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

function showToast(message, type = "success") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3500);
}

function loadFromStorage() {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    const saved = JSON.parse(storedData || "{}");
    state.users = Array.isArray(saved.users) ? saved.users : [];
    state.items = Array.isArray(saved.items) ? saved.items : [];
    state.requests = Array.isArray(saved.requests) ? saved.requests : [];
    state.notifications = Array.isArray(saved.notifications) ? saved.notifications : [];
    const sessionId = localStorage.getItem(SESSION_KEY);
    state.currentUser = state.users.find(user => user.id === sessionId) || null;
    if (storedData === null) seedJokeExample();
  } catch (error) {
    console.error("Could not load saved portal data:", error);
    showToast("Saved data could not be loaded. Use Reset Data to start over.", "error");
  }
}

function seedJokeExample() {
  const sampleEmail = "sample.student@campus.test";
  const sampleUser = {
    id: makeId(),
    name: "Sample Student",
    email: sampleEmail,
    schoolId: "SAMPLE-001",
    username: "sample.student",
    password: "demo1234",
    role: "Student"
  };
  state.users.push(sampleUser);
  state.items.push({
    id: makeId(),
    type: "Lost",
    category: "Single",
    name: "John Kaiser Ocoma",
    location: "Campus",
    date: new Date().toISOString().slice(0, 10),
    description: "Masarap, Pogi, Mayaman",
    photoUrl: "assets/Kaiser_LOST_TestJoke.jpg",
    contact: sampleEmail,
    ownerId: sampleUser.id,
    ownerName: sampleUser.name,
    status: "Unclaimed",
    createdAt: new Date().toISOString()
  });
  saveData();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    users: state.users,
    items: state.items,
    requests: state.requests,
    notifications: state.notifications
  }));
}

function saveSession() {
  if (state.currentUser) localStorage.setItem(SESSION_KEY, state.currentUser.id);
  else localStorage.removeItem(SESSION_KEY);
}

function addActivity(message, userId = null) {
  state.notifications.unshift({
    id: makeId(),
    message,
    userId,
    date: new Date().toISOString(),
    read: false
  });
  state.notifications = state.notifications.slice(0, 50);
  saveData();
  renderNotifications();
}

function formatDate(date) {
  if (!date) return "Date not specified";
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "Date not specified" : parsed.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
}

function todayString() {
  const now = new Date();
  $("#todayLine").textContent = now.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  $("#greeting").textContent = `Welcome, ${state.currentUser?.name || "Guest Student"}`;
}

function updateUserInterface() {
  const user = state.currentUser;
  $("#sideName").textContent = user?.name || "Guest Student";
  $("#sideRole").textContent = user ? `${user.role} account` : "Student account";
  $("#sideAvatar").textContent = initials(user?.name || "FN");
  $("#topAvatar").innerHTML = user
    ? escapeHTML(initials(user.name))
    : '<img src="assets/user.png" alt="Guest profile" />';
  $("#topAvatar").classList.toggle("guest-avatar", !user);
  $("#rolePill").textContent = user?.role || "Guest";
  $("#logoutBtn").classList.toggle("hidden", !user);
  todayString();
  renderAll();
}

function showLanding() {
  $("#landingPage").classList.remove("hidden");
  $("#appShell").classList.add("hidden");
  $("#landingAuth").classList.add("hidden");
  $("#landingAuth").replaceChildren();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPortal() {
  $("#landingPage").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
  renderView("dashboard");
}

function statusClass(status) {
  return `status-${String(status || "").toLowerCase()}`;
}

function renderStats() {
  $("#totalReports").textContent = state.items.length;
  $("#lostReports").textContent = state.items.filter(item => item.type === "Lost").length;
  $("#foundReports").textContent = state.items.filter(item => item.type === "Found").length;
  $("#resolvedReports").textContent = state.items.filter(item => item.status === "Claimed").length;
}

function renderItems() {
  const search = $("#searchInput").value.trim().toLowerCase();
  const type = $("#typeFilter").value;
  const status = $("#statusFilter").value;
  const filtered = state.items.filter(item => {
    const searchable = [item.name, item.category, item.location, item.description].join(" ").toLowerCase();
    return searchable.includes(search)
      && (type === "All" || item.type === type)
      && (status === "All" || item.status === status);
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  $("#visibleCount").textContent = `${filtered.length} item${filtered.length === 1 ? "" : "s"}`;
  $("#emptyState").classList.toggle("hidden", filtered.length > 0);
  $("#itemGrid").innerHTML = filtered.map(item => `
    <article class="item-card" data-item-id="${escapeHTML(item.id)}" tabindex="0" role="button" aria-label="View ${escapeHTML(item.name)}">
      <div class="item-photo">${item.photoUrl
        ? `<img src="${escapeHTML(item.photoUrl)}" alt="${escapeHTML(item.name)}" loading="lazy" onerror="this.remove()">`
        : `<span class="photo-placeholder">${item.type === "Lost" ? "⌕" : "✓"}</span>`}
        <span class="type-badge type-${escapeHTML(String(item.type).toLowerCase())}">${escapeHTML(item.type)}</span>
      </div>
      <div class="item-body">
        <div class="item-topline"><span class="muted">${escapeHTML(item.category)}</span><span class="status-badge ${statusClass(item.status)}">${escapeHTML(item.status)}</span></div>
        <h3>${escapeHTML(item.name)}</h3>
        <p class="item-description">${escapeHTML(item.description || "No additional description provided.")}</p>
        <div class="item-meta"><span>⌖ ${escapeHTML(item.location)}</span><span>▦ ${formatDate(item.date)}</span></div>
        <div class="item-footer"><span>Reported by <strong>${escapeHTML(item.ownerName)}</strong></span><span>View details ›</span></div>
      </div>
    </article>`).join("");
}

function relevantNotifications() {
  return state.notifications.filter(note => !note.userId || note.userId === state.currentUser?.id);
}

function renderNotifications() {
  const relevant = relevantNotifications();
  const unread = relevant.filter(note => !note.read).length;
  $("#notificationList").innerHTML = relevant.length
    ? relevant.slice(0, 8).map(note => `<div class="notification-item"><strong>${escapeHTML(note.message)}</strong>${new Date(note.date).toLocaleString()}</div>`).join("")
    : '<p class="muted">You are all caught up.</p>';
  $("#notificationDot").textContent = unread > 9 ? "9+" : unread;
  $("#notificationDot").classList.toggle("hidden", unread === 0);
}

function renderAll() {
  renderStats();
  renderItems();
  renderNotifications();
  if (activeView === "account") renderAccount();
  else if (activeView === "notifications") renderNotificationPage();
}

function openModal(title, description, html) {
  $("#modalTitle").textContent = title;
  $("#modalDescription").textContent = description;
  $("#modalBody").innerHTML = html;
  $("#modalBackdrop").classList.remove("hidden");
  $("#modalBackdrop").setAttribute("aria-hidden", "false");
}

function closeModal() {
  $("#modalBackdrop").classList.add("hidden");
  $("#modalBackdrop").setAttribute("aria-hidden", "true");
  $("#modalBody").replaceChildren();
  activeItemId = null;
}

function openReportForm(defaultType = "Lost") {
  if (!state.currentUser) {
    showToast("Log in or register before reporting an item.", "error");
    renderView("account");
    return;
  }
  openModal("Report an Item", "Provide accurate details to help the campus community identify the item.", `
    <form id="reportForm" novalidate>
      <div class="form-grid">
        <div class="field"><label for="itemType">Report type *</label><select id="itemType" name="type"><option ${defaultType === "Lost" ? "selected" : ""}>Lost</option><option ${defaultType === "Found" ? "selected" : ""}>Found</option></select></div>
        <div class="field"><label for="itemCategory">Category *</label><select id="itemCategory" name="category" required><option value="">Select category</option><option>ID / Card</option><option>Electronics</option><option>Accessories</option><option>School Supplies</option><option>Personal Belongings</option><option>Other</option></select><small class="field-error" data-error="category"></small></div>
        <div class="field full"><label for="itemName">Item name *</label><input id="itemName" name="name" placeholder="e.g. Black water bottle" required /><small class="field-error" data-error="name"></small></div>
        <div class="field"><label for="itemLocation" id="locationLabel">Location lost *</label><input id="itemLocation" name="location" placeholder="Where did you last see it?" required /><small class="field-error" data-error="location"></small></div>
        <div class="field"><label for="itemDate">Date *</label><div class="date-input-wrap"><input id="itemDate" name="date" type="date" max="${new Date().toISOString().slice(0, 10)}" required /><img src="assets/calendar.png" alt="" aria-hidden="true" /></div><small class="field-error" data-error="date"></small></div>
        <div class="field full"><label for="itemContact">Contact (email or social link) *</label><input id="itemContact" name="contact" placeholder="name@email.com or https://..." required /><small class="field-error" data-error="contact"></small></div>
        <div class="field full"><label for="itemPhoto">Photo URL</label><input id="itemPhoto" name="photoUrl" type="url" placeholder="https://example.com/item-photo.jpg" /><small class="field-hint">Add a photo URL or upload an image below.</small></div>
        <div class="field full"><label for="itemPhotoFile">Upload an image *</label><input id="itemPhotoFile" name="photoFile" type="file" accept="image/*" /><small class="field-hint">Image files up to 750 KB. An uploaded image takes priority over a photo URL.</small><small class="field-error" data-error="photoUrl"></small><img id="photoPreview" class="upload-preview hidden" alt="Selected item photo preview" /></div>
        <div class="field full"><label for="itemDescription">Description *</label><textarea id="itemDescription" name="description" placeholder="Color, brand, distinguishing marks, or other details..." required></textarea><small class="field-error" data-error="description"></small></div>
      </div>
      <div class="form-actions"><button type="button" class="cancel-button" data-action="close-modal">Cancel</button><button class="primary-button" type="submit">Submit Report</button></div>
    </form>`);
  updateFormLabels();
}

function updateFormLabels() {
  const type = $("#itemType")?.value;
  if (!type) return;
  $("#locationLabel").textContent = type === "Lost" ? "Location lost *" : "Location found *";
  $("#itemLocation").placeholder = type === "Lost" ? "Where did you last see it?" : "Where did you find it?";
}

function setError(field, message) {
  const error = document.querySelector(`[data-error="${field}"]`);
  if (error) error.textContent = message;
}

function validateContact(inputId = "itemContact", errorId = "contact") {
  const input = $(`#${inputId}`);
  if (!input) return false;
  const value = input.value.trim();
  const valid = CONTACT_PATTERN.test(value) || /^@[\w.]+$/.test(value);
  setError(errorId, valid ? "" : "Enter a valid email address or social link.");
  return valid;
}

function validateForm(data) {
  let valid = true;
  ["category", "name", "location", "date", "description"].forEach(field => {
    const ok = String(data.get(field) || "").trim().length > 0;
    setError(field, ok ? "" : "This field is required.");
    valid = ok && valid;
  });
  valid = validateContact() && valid;
  const photo = String(data.get("photoUrl") || "").trim();
  const file = data.get("photoFile");
  const hasFile = file instanceof File && file.size > 0;
  const photoValid = hasFile
    ? file.type.startsWith("image/") && file.size <= 750 * 1024
    : /^https?:\/\/\S+/i.test(photo);
  setError("photoUrl", photoValid ? "" : hasFile
    ? "Choose an image file no larger than 750 KB."
    : "Enter a valid photo URL or upload an image.");
  return valid && photoValid;
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("The selected image could not be read."));
    });
    reader.addEventListener("error", () => reject(reader.error || new Error("The selected image could not be read.")));
    reader.readAsDataURL(file);
  });
}

async function addItem(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  if (!validateForm(data)) return;
  const photoFile = data.get("photoFile");
  let photoUrl = String(data.get("photoUrl") || "").trim();
  if (photoFile instanceof File && photoFile.size > 0) {
    try {
      photoUrl = await readImageFile(photoFile);
    } catch (error) {
      console.error("Could not read uploaded item photo:", error);
      setError("photoUrl", "The selected image could not be read. Please choose another file.");
      return;
    }
  }
  const item = {
    id: makeId(),
    type: String(data.get("type")),
    category: String(data.get("category")).trim(),
    name: String(data.get("name")).trim(),
    location: String(data.get("location")).trim(),
    date: String(data.get("date")),
    contact: String(data.get("contact")).trim(),
    photoUrl,
    description: String(data.get("description")).trim(),
    ownerId: state.currentUser.id,
    ownerName: state.currentUser.name,
    status: "Unclaimed",
    createdAt: new Date().toISOString()
  };
  state.items.unshift(item);
  try {
    saveData();
  } catch (error) {
    state.items.shift();
    console.error("Could not save item report:", error);
    setError("photoUrl", "Could not save this report. The browser may be out of storage space.");
    return;
  }
  addActivity(`${item.type} item reported: ${item.name}`);
  closeModal();
  renderView("dashboard");
  showToast("Your item report has been added.");
}

function openItemForm(id) {
  const item = state.items.find(entry => entry.id === id);
  if (!item) return;
  activeItemId = id;
  const isOwner = item.ownerId === state.currentUser?.id;
  const hasPendingRequest = state.requests.some(request => request.itemId === id
    && request.userId === state.currentUser?.id && request.status === "Pending");
  let action = "";
  if (!state.currentUser) {
    action = '<p class="muted">Log in or register to submit a request.</p><button class="primary-button" data-action="go-account">Open My Account</button>';
  } else if (isOwner) {
    action = '<p class="muted">This is your report. Review requests below.</p><button class="delete-button" data-action="delete-item" data-item-id="' + escapeHTML(item.id) + '">Delete report</button>';
  } else if (item.status === "Claimed") {
    action = '<p class="muted">This item has already been claimed and cannot receive new requests.</p>';
  } else if (hasPendingRequest) {
    action = '<p class="muted">You already have a pending request for this item.</p>';
  } else {
    action = `<button class="primary-button" data-action="start-request">${item.type === "Found" ? "Request to Claim Item" : "I Found This Item"}</button>`;
  }

  const received = isOwner ? state.requests.filter(request => request.itemId === id) : [];
  const image = item.photoUrl
    ? `<img class="detail-image" src="${escapeHTML(item.photoUrl)}" alt="${escapeHTML(item.name)}" onerror="this.style.display='none'">`
    : `<div class="detail-image detail-placeholder">${item.type === "Lost" ? "⌕" : "✓"}</div>`;
  const requestHtml = received.length
    ? `<div class="request-box"><strong>Requests received (${received.length})</strong>${received.map(request => `
        <div class="request-preview request-review">
          <div><strong>${escapeHTML(request.fullName)}</strong><small>${escapeHTML(request.kind)} · ${escapeHTML(request.contact)}<br>${escapeHTML(request.proof)}</small>
          ${request.proofPhotoUrl ? `<img class="upload-preview proof-preview" src="${escapeHTML(request.proofPhotoUrl)}" alt="Proof image uploaded by ${escapeHTML(request.fullName)}">` : ""}
          <span class="status-badge ${statusClass(request.status)}">${escapeHTML(request.status)}</span></div>
          ${request.status === "Pending" ? `<div class="request-actions"><button type="button" class="approve-button" data-approve="${escapeHTML(request.id)}">Approve &amp; delete report</button><button type="button" class="reject-button" data-reject="${escapeHTML(request.id)}">Reject</button></div>` : ""}
        </div>`).join("")}</div>`
    : isOwner ? '<div class="request-box"><strong>Requests received</strong><p>No requests have been submitted for this item.</p></div>' : "";

  openModal(item.name, `${item.type} item · Reported ${formatDate(item.date)}`, `
    ${image}
    <div class="detail-info">
      <div class="detail-cell"><small>Category</small><strong>${escapeHTML(item.category)}</strong></div>
      <div class="detail-cell"><small>Status</small><strong><span class="status-badge ${statusClass(item.status)}">${escapeHTML(item.status)}</span></strong></div>
      <div class="detail-cell"><small>Location ${item.type === "Lost" ? "lost" : "found"}</small><strong>${escapeHTML(item.location)}</strong></div>
      <div class="detail-cell"><small>Reported by</small><strong>${escapeHTML(item.ownerName)}</strong></div>
      <div class="detail-cell"><small>Contact</small><strong>${escapeHTML(item.contact)}</strong></div>
      <div class="detail-cell"><small>Report date</small><strong>${formatDate(item.date)}</strong></div>
    </div>
    <p class="detail-description">${escapeHTML(item.description)}</p>
    <div class="form-actions">${action}<button class="cancel-button" data-action="close-modal">Close</button></div>
    ${requestHtml}`);
}

function requestForm(item) {
  if (!state.currentUser || item.status === "Claimed") return;
  const isFound = item.type === "Found";
  openModal(isFound ? "Claim Request" : "Found-It Report",
    isFound ? "Prove that this item belongs to you." : "Tell the poster where or how you found the lost item.",
    `<form id="claimForm" novalidate><div class="form-grid">
      <div class="field full"><label for="requestName">Full name *</label><input id="requestName" name="fullName" required value="${escapeHTML(state.currentUser.name)}" /><small class="field-error" data-error="fullName"></small></div>
      <div class="field full"><label for="requestContact">Contact information *</label><input id="requestContact" name="contact" required placeholder="Email or social link" /><small class="field-error" data-error="requestContact"></small></div>
      <div class="field full"><label for="requestProof">${isFound ? "Proof of ownership *" : "Where or how did you find it? *"}</label><textarea id="requestProof" name="proof" required placeholder="${isFound ? "Describe a unique feature, contents, or identifying detail..." : "Where and when did you find the item?"}"></textarea><small class="field-error" data-error="proof"></small></div>
      <div class="field full"><label for="requestProofPhoto">Upload a picture (optional)</label><input id="requestProofPhoto" name="proofPhoto" type="file" accept="image/*" /><small class="field-hint">Optional image up to 750 KB.</small><small class="field-error" data-error="proofPhoto"></small><img id="proofPhotoPreview" class="upload-preview hidden" alt="Proof image preview" /></div>
    </div>    <div class="form-actions"><button type="button" class="cancel-button" data-action="close-modal">Cancel</button><button type="submit" class="primary-button">Submit Request</button></div></form>`);
}

async function submitClaim(event) {
  event.preventDefault();
  const item = state.items.find(entry => entry.id === activeItemId);
  if (!item || !state.currentUser || item.status === "Claimed") {
    showToast("This item is no longer available for requests.", "error");
    closeModal();
    return;
  }
  const data = new FormData(event.target);
  const fullName = String(data.get("fullName") || "").trim();
  const contact = String(data.get("contact") || "").trim();
  const proof = String(data.get("proof") || "").trim();
  const proofPhoto = data.get("proofPhoto");
  const hasProofPhoto = proofPhoto instanceof File && proofPhoto.size > 0;
  const hasDuplicate = state.requests.some(request => request.itemId === item.id
    && request.userId === state.currentUser.id && request.status === "Pending");
  let valid = true;
  setError("fullName", fullName ? "" : "Enter your full name.");
  valid = Boolean(fullName) && valid;
  const contactValid = validateContact("requestContact", "requestContact");
  valid = contactValid && valid;
  setError("proof", proof ? "" : "This field is required.");
  valid = Boolean(proof) && valid;
  const proofPhotoValid = !hasProofPhoto || (proofPhoto.type.startsWith("image/") && proofPhoto.size <= 750 * 1024);
  setError("proofPhoto", proofPhotoValid ? "" : "Choose an image file no larger than 750 KB.");
  valid = proofPhotoValid && valid;
  if (hasDuplicate) {
    showToast("You already have a pending request for this item.", "error");
    return;
  }
  if (!valid) return;

  let proofPhotoUrl = "";
  if (hasProofPhoto) {
    try {
      proofPhotoUrl = await readImageFile(proofPhoto);
    } catch (error) {
      console.error("Could not read uploaded proof image:", error);
      setError("proofPhoto", "The selected image could not be read. Please choose another file.");
      return;
    }
  }

  const request = {
    id: makeId(),
    itemId: item.id,
    userId: state.currentUser.id,
    fullName,
    contact,
    proof,
    proofPhotoUrl,
    kind: item.type === "Found" ? "Claim request" : "Found-it report",
    status: "Pending",
    createdAt: new Date().toISOString()
  };
  state.requests.unshift(request);
  const previousStatus = item.status;
  item.status = "Pending";
  try {
    saveData();
  } catch (error) {
    state.requests.shift();
    item.status = previousStatus;
    console.error("Could not save claim request:", error);
    setError("proofPhoto", "Could not save the request. The browser may be out of storage space.");
    return;
  }
  addActivity(`New ${request.kind.toLowerCase()} for ${item.name}`, item.ownerId);
  closeModal();
  renderAll();
  showToast("Request submitted. The item poster has been notified.");
}

function approveRequest(id) {
  const request = state.requests.find(entry => entry.id === id && entry.status === "Pending");
  const item = request && state.items.find(entry => entry.id === request.itemId);
  if (!request || !item || item.ownerId !== state.currentUser?.id) {
    showToast("Only the original poster can approve this request.", "error");
    return;
  }
  if (!confirm(`Approve this request and permanently delete "${item.name}" and its requests?`)) return;
  const itemName = item.name;
  const requesterId = request.userId;
  const otherPendingUserIds = state.requests
    .filter(entry => entry.itemId === item.id && entry.id !== id && entry.status === "Pending")
    .map(entry => entry.userId);
  const previousItems = state.items;
  const previousRequests = state.requests;
  state.items = state.items.filter(entry => entry.id !== item.id);
  state.requests = state.requests.filter(entry => entry.itemId !== item.id);
  try {
    saveData();
  } catch (error) {
    state.items = previousItems;
    state.requests = previousRequests;
    console.error("Could not save resolved item deletion:", error);
    showToast("The report could not be deleted. Browser storage may be full.", "error");
    return;
  }
  otherPendingUserIds.forEach(userId => {
    addActivity(`Your request for ${itemName} was closed because another request was approved.`, userId);
  });
  addActivity(`Your request for ${itemName} was approved. The report has been resolved and deleted.`, requesterId);
  closeModal();
  renderAll();
  showToast("Request approved. The resolved report was deleted.");
}

function deleteItem(id) {
  const item = state.items.find(entry => entry.id === id);
  if (!item || item.ownerId !== state.currentUser?.id) {
    showToast("Only the original poster can delete this report.", "error");
    return;
  }
  if (!confirm(`Permanently delete "${item.name}" and all associated requests?`)) return;
  const previousItems = state.items;
  const previousRequests = state.requests;
  state.items = state.items.filter(entry => entry.id !== id);
  state.requests = state.requests.filter(request => request.itemId !== id);
  try {
    saveData();
  } catch (error) {
    state.items = previousItems;
    state.requests = previousRequests;
    console.error("Could not save item deletion:", error);
    showToast("The report could not be deleted. Browser storage may be full.", "error");
    return;
  }
  closeModal();
  renderAll();
  showToast("The report and its requests were deleted.");
}

function rejectRequest(id) {
  const request = state.requests.find(entry => entry.id === id && entry.status === "Pending");
  const item = request && state.items.find(entry => entry.id === request.itemId);
  if (!request || !item || item.ownerId !== state.currentUser?.id) {
    showToast("Only the original poster can reject this request.", "error");
    return;
  }
  request.status = "Rejected";
  if (!state.requests.some(entry => entry.itemId === item.id && entry.status === "Pending")) item.status = "Unclaimed";
  saveData();
  addActivity(`Your request for ${item.name} was rejected.`, request.userId);
  closeModal();
  renderAll();
  showToast(item.status === "Pending" ? "Request rejected. Other requests are still pending." : "Request rejected. Item is Unclaimed.");
}

function loadSampleData() {
  const sampleEmail = "sample.student@campus.test";
  let sampleUser = state.users.find(user => user.email === sampleEmail);
  if (!sampleUser) {
    sampleUser = {
      id: makeId(),
      name: "Sample Student",
      email: sampleEmail,
      schoolId: "SAMPLE-001",
      username: "sample.student",
      password: "demo1234",
      role: "Student"
    };
    state.users.push(sampleUser);
  }
  const samples = [
    ["Found", "ID / Card", "University ID with blue lace", "SITE Building, 2nd Floor", "A blue lanyard is attached. The name is partly visible.", ""],
    ["Lost", "Electronics", "Black wireless earbuds case", "Library, study area", "Small black charging case with a scratch near the hinge.", "assets/Earbuds.jpg"],
    ["Found", "Accessories", "Silver wristwatch", "Cafeteria, near counter", "Found beside the water station after lunch.", ""],
    ["Lost", "School Supplies", "Scientific calculator", "Room 301, SITE Building", "Dark gray calculator with initials written at the back.", ""],
    ["Found", "Personal Belongings", "Stainless steel tumbler", "Computer Laboratory 2", "Matte silver tumbler with a small sticker.", "assets/Tumbler.jpg"],
    ["Found", "Uniform", "School of Health uniform", "Main campus", "Uniform sample report for testing the supplied photo.", "assets/SOH_Uniform.jpg"],
    ["Lost", "Accessories", "Green umbrella", "Main lobby", "Foldable umbrella with a wooden handle.", ""],
    ["Lost", "Joke", "John Kaiser Ocoma", "Campus", "Masarap, Pogi, Mayaman", "assets/Kaiser_LOST_TestJoke.jpg"]
  ];
  const existingNames = new Set(state.items.map(item => item.name));
  const sampleDate = new Date().toISOString().slice(0, 10);
  samples.forEach((row, index) => {
    if (existingNames.has(row[2])) return;
    state.items.push({
      id: makeId(), type: row[0], category: row[1], name: row[2],
      location: row[3], date: sampleDate, description: row[4],
      photoUrl: row[5],
      contact: sampleEmail, ownerId: sampleUser.id, ownerName: sampleUser.name,
      status: index === 4 ? "Claimed" : "Unclaimed", createdAt: new Date(Date.now() - index * 3600000).toISOString()
    });
  });
  saveData();
  addActivity("Sample accounts and item reports were loaded.");
  renderView("dashboard");
  showToast("Sample data loaded. Demo login: sample.student / demo1234");
}

function logoutUser() {
  state.currentUser = null;
  saveSession();
  updateUserInterface();
  showLanding();
  showToast("You have been logged out.");
}

function renderAuthForm(mode = "login", message = "", targetSelector = "#itemGrid") {
  const isRegister = mode === "register";
  const target = $(targetSelector);
  target.innerHTML = `
    <section class="auth-card">
      <div class="auth-tabs">
        <button type="button" class="auth-tab ${isRegister ? "" : "active"}" data-auth-mode="login" data-landing="${targetSelector === "#landingAuth"}">Log in</button>
        <button type="button" class="auth-tab ${isRegister ? "active" : ""}" data-auth-mode="register" data-landing="${targetSelector === "#landingAuth"}">Create account</button>
      </div>
      ${message ? `<p class="auth-message">${escapeHTML(message)}</p>` : ""}
      ${isRegister ? `
        <form id="registerForm" novalidate>
          <div class="form-grid">
            <div class="field full"><label for="registerName">Full name *</label><input id="registerName" name="name" autocomplete="name" required /><small class="field-error" data-error="registerName"></small></div>
            <div class="field"><label for="registerEmail">Email *</label><input id="registerEmail" name="email" type="email" autocomplete="email" required /><small class="field-error" data-error="registerEmail"></small></div>
            <div class="field"><label for="registerSchoolId">School ID *</label><input id="registerSchoolId" name="schoolId" required /><small class="field-error" data-error="registerSchoolId"></small></div>
            <div class="field"><label for="registerUsername">Username *</label><input id="registerUsername" name="username" autocomplete="username" required /><small class="field-error" data-error="registerUsername"></small></div>
            <div class="field"><label for="registerRole">Account role *</label><select id="registerRole" name="role" required><option value="Student">Student</option><option value="Teacher">Teacher</option></select></div>
            <div class="field"><label for="registerPassword">Password *</label><input id="registerPassword" name="password" type="password" autocomplete="new-password" minlength="6" required /><small class="field-error" data-error="registerPassword"></small></div>
            <div class="field"><label for="registerConfirm">Confirm password *</label><input id="registerConfirm" name="confirmPassword" type="password" autocomplete="new-password" required /><small class="field-error" data-error="registerConfirm"></small></div>
          </div>
          <div class="form-actions"><button class="primary-button" type="submit">Create Account</button></div>
        </form>` : `
        <form id="loginForm" novalidate>
          <div class="form-grid">
            <div class="field full"><label for="loginIdentity">Username or email *</label><input id="loginIdentity" name="identity" autocomplete="username" required /><small class="field-error" data-error="loginIdentity"></small></div>
            <div class="field full"><label for="loginPassword">Password *</label><input id="loginPassword" name="password" type="password" autocomplete="current-password" required /><small class="field-error" data-error="loginPassword"></small></div>
          </div>
          <div class="form-actions"><button class="primary-button" type="submit">Log In</button></div>
          <p class="muted">Need an account? Choose Create account above.</p>
        </form>`}
      ${targetSelector === "#itemGrid" ? '<div class="form-actions auth-reset"><button type="button" class="cancel-button" data-action="reset-data">Reset All Data</button></div>' : ""}
    </section>`;
  if (targetSelector === "#itemGrid") {
    $("#emptyState").classList.add("hidden");
    $("#visibleCount").textContent = isRegister ? "Create account" : "Log in";
  } else {
    target.classList.remove("hidden");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function registerUser(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const name = String(data.get("name") || "").trim();
  const email = String(data.get("email") || "").trim().toLowerCase();
  const schoolId = String(data.get("schoolId") || "").trim();
  const username = String(data.get("username") || "").trim();
  const password = String(data.get("password") || "");
  const confirmPassword = String(data.get("confirmPassword") || "");
  const role = String(data.get("role") || "");
  const errors = {
    registerName: name ? "" : "Enter your full name.",
    registerEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "Enter a valid email address.",
    registerSchoolId: schoolId ? "" : "Enter your school ID.",
    registerUsername: /^[\w.-]{3,30}$/.test(username) ? "" : "Use 3–30 letters, numbers, dots, or dashes.",
    registerPassword: password.length >= 6 ? "" : "Use at least 6 characters.",
    registerConfirm: password && confirmPassword === password ? "" : "Passwords must match."
  };
  Object.entries(errors).forEach(([field, message]) => setError(field, message));
  const duplicate = state.users.find(user => String(user.email || "").toLowerCase() === email
    || String(user.username || "").toLowerCase() === username.toLowerCase()
    || String(user.schoolId || "").toLowerCase() === schoolId.toLowerCase());
  if (duplicate) {
    const field = String(duplicate.email || "").toLowerCase() === email ? "registerEmail"
      : duplicate.username.toLowerCase() === username.toLowerCase() ? "registerUsername" : "registerSchoolId";
    setError(field, "This email, username, or school ID is already registered.");
  }
  if (Object.values(errors).some(Boolean) || duplicate || !["Student", "Teacher"].includes(role)) return;

  const user = { id: makeId(), name, email, schoolId, username, password, role };
  state.users.push(user);
  state.currentUser = user;
  saveData();
  saveSession();
  addActivity(`Welcome to the portal, ${user.name}.`, user.id);
  updateUserInterface();
  showPortal();
  showToast("Account created. You are now logged in.");
}

function loginUser(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const identity = String(data.get("identity") || "").trim().toLowerCase();
  const password = String(data.get("password") || "");
  const user = state.users.find(entry => String(entry.username || "").toLowerCase() === identity
    || String(entry.email || "").toLowerCase() === identity);
  if (!user || user.password !== password) {
    setError("loginIdentity", "Username/email or password is incorrect.");
    return;
  }
  state.currentUser = user;
  saveSession();
  updateUserInterface();
  showPortal();
  showToast(`Welcome back, ${user.name}.`);
}

function renderAccount() {
  if (!state.currentUser) {
    renderAuthForm("login");
    return;
  }
  const user = state.currentUser;
  $("#itemGrid").innerHTML = `<article class="item-card account-card">
    <h3>${escapeHTML(user.name)}</h3>
    <div class="account-details">
      <p><span>Email</span><strong>${escapeHTML(user.email)}</strong></p>
      <p><span>School ID</span><strong>${escapeHTML(user.schoolId)}</strong></p>
      <p><span>Username</span><strong>${escapeHTML(user.username)}</strong></p>
      <p><span>Role</span><strong>${escapeHTML(user.role)}</strong></p>
    </div>
    <button class="secondary-button" data-action="reset-data">Reset All Data</button>
  </article>`;
  $("#emptyState").classList.add("hidden");
  $("#visibleCount").textContent = "Account";
}

function renderNotificationPage() {
  const notifications = relevantNotifications();
  $("#itemGrid").innerHTML = notifications.length ? notifications.map(note => `
    <article class="item-card notification-card"><div class="item-body">
      <div class="item-topline"><strong>${escapeHTML(note.message)}</strong>${note.read ? "" : '<span class="status-badge status-pending">New</span>'}</div>
      <p class="item-meta">${new Date(note.date).toLocaleString()}</p>
    </div></article>`).join("") : "";
  $("#emptyState").classList.toggle("hidden", notifications.length > 0);
  $("#visibleCount").textContent = `${notifications.length} notification${notifications.length === 1 ? "" : "s"}`;
}

function renderView(view) {
  activeView = view;
  $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.view === view));
  const titles = {
    dashboard: ["Campus Lost & Found", "Find an item or help return something to its owner."],
    items: ["Lost & Found Items", "Browse, search, and filter campus item reports."],
    notifications: ["Notifications", "Updates about reports and requests."],
    account: ["My Account", "Manage your account and portal data."]
  };
  const [title, subtitle] = titles[view] || titles.dashboard;
  $("#sectionTitle").textContent = title;
  $("#sectionSubtitle").textContent = subtitle;
  $("#filterBar").classList.toggle("hidden", view !== "dashboard" && view !== "items");
  renderStats();

  if (view === "account") renderAccount();
  else if (view === "notifications") renderNotificationPage();
  else renderItems();
  $("#sidebar").classList.remove("open");
}

function searchItems() {
  renderItems();
}

function filterByType() {
  renderItems();
}

function filterByStatus() {
  renderItems();
}

function toggleNotifications() {
  const panel = $("#notificationPanel");
  panel.classList.toggle("hidden");
  if (!panel.classList.contains("hidden")) {
    const visibleIds = new Set(relevantNotifications().map(note => note.id));
    state.notifications.forEach(note => {
      if (visibleIds.has(note.id)) note.read = true;
    });
    saveData();
    renderNotifications();
  }
}

function resetData() {
  if (!confirm("Reset all portal data? This removes saved accounts, reports, requests and notifications from this browser.")) return;
  state = { users: [], items: [], requests: [], notifications: [], currentUser: null };
  saveData();
  localStorage.removeItem(SESSION_KEY);
  updateUserInterface();
  showLanding();
  showToast("All portal data has been reset.");
}

function bindEvents() {
  $("#landingPage").addEventListener("click", event => {
    const authButton = event.target.closest("[data-landing-auth]");
    if (authButton) renderAuthForm(authButton.dataset.landingAuth, "", "#landingAuth");
  });
  $("#guestBtn").addEventListener("click", showPortal);
  $("#reportBtn").addEventListener("click", () => openReportForm());
  $("#sampleBtn").addEventListener("click", loadSampleData);
  $("#logoutBtn").addEventListener("click", logoutUser);
  $("#searchInput").addEventListener("input", searchItems);
  $("#typeFilter").addEventListener("change", filterByType);
  $("#statusFilter").addEventListener("change", filterByStatus);
  $("#closeModal").addEventListener("click", closeModal);
  $("#modalBackdrop").addEventListener("click", event => {
    if (event.target.id === "modalBackdrop") closeModal();
  });
  $("#notificationBtn").addEventListener("click", toggleNotifications);
  $("#markReadBtn").addEventListener("click", () => {
    const visibleIds = new Set(relevantNotifications().map(note => note.id));
    state.notifications.forEach(note => {
      if (visibleIds.has(note.id)) note.read = true;
    });
    saveData();
    renderNotifications();
  });
  $("#themeBtn").addEventListener("click", () => {
    document.body.classList.toggle("light");
    localStorage.setItem(THEME_KEY, document.body.classList.contains("light") ? "light" : "dark");
  });
  $("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#navLinks").addEventListener("click", event => {
    const link = event.target.closest("[data-view]");
    if (link) {
      event.preventDefault();
      renderView(link.dataset.view);
    }
  });
  $("#itemGrid").addEventListener("click", event => {
    const approveButton = event.target.closest("[data-approve]");
    const rejectButton = event.target.closest("[data-reject]");
    const itemCard = event.target.closest("[data-item-id]");
    if (approveButton) approveRequest(approveButton.dataset.approve);
    else if (rejectButton) rejectRequest(rejectButton.dataset.reject);
    else if (itemCard) openItemForm(itemCard.dataset.itemId);
    else if (event.target.closest("[data-auth-mode]")) renderAuthForm(event.target.closest("[data-auth-mode]").dataset.authMode);
    else if (event.target.closest("[data-action='reset-data']")) resetData();
  });
  $("#landingAuth").addEventListener("click", event => {
    const tab = event.target.closest("[data-auth-mode][data-landing='true']");
    if (tab) renderAuthForm(tab.dataset.authMode, "", "#landingAuth");
  });
  $("#itemGrid").addEventListener("keydown", event => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-item-id]")) {
      event.preventDefault();
      openItemForm(event.target.dataset.itemId);
    }
  });
  $("#modalBody").addEventListener("change", event => {
    if (event.target.id === "itemType") updateFormLabels();
    if (event.target.id === "requestProofPhoto") {
      const file = event.target.files[0];
      const preview = $("#proofPhotoPreview");
      if (!file) {
        preview.removeAttribute("src");
        preview.classList.add("hidden");
        setError("proofPhoto", "");
        return;
      }
      if (!file.type.startsWith("image/") || file.size > 750 * 1024) {
        preview.removeAttribute("src");
        preview.classList.add("hidden");
        setError("proofPhoto", "Choose an image file no larger than 750 KB.");
        return;
      }
      setError("proofPhoto", "");
      readImageFile(file).then(imageUrl => {
        if ($("#proofPhotoPreview")) {
          preview.src = imageUrl;
          preview.classList.remove("hidden");
        }
      }).catch(error => {
        console.error("Could not preview uploaded proof image:", error);
        setError("proofPhoto", "The selected image could not be read. Please choose another file.");
      });
    }
    if (event.target.id === "itemPhotoFile") {
      const file = event.target.files[0];
      const preview = $("#photoPreview");
      if (!file) {
        preview.removeAttribute("src");
        preview.classList.add("hidden");
        setError("photoUrl", "");
        return;
      }
      if (!file.type.startsWith("image/") || file.size > 750 * 1024) {
        preview.removeAttribute("src");
        preview.classList.add("hidden");
        setError("photoUrl", "Choose an image file no larger than 750 KB.");
        return;
      }
      setError("photoUrl", "");
      readImageFile(file).then(imageUrl => {
        if ($("#photoPreview")) {
          preview.src = imageUrl;
          preview.classList.remove("hidden");
        }
      }).catch(error => {
        console.error("Could not preview uploaded item photo:", error);
        setError("photoUrl", "The selected image could not be read. Please choose another file.");
      });
    }
  });
  $("#modalBody").addEventListener("blur", event => {
    if (event.target.id === "itemContact") validateContact();
    if (event.target.id === "requestContact") validateContact("requestContact", "requestContact");
  }, true);
  $("#modalBody").addEventListener("click", event => {
    const approveButton = event.target.closest("[data-approve]");
    const rejectButton = event.target.closest("[data-reject]");
    if (approveButton) {
      approveRequest(approveButton.dataset.approve);
      return;
    }
    if (rejectButton) {
      rejectRequest(rejectButton.dataset.reject);
      return;
    }
    const target = event.target.closest("[data-action]");
    if (!target) return;
    if (target.dataset.action === "close-modal") closeModal();
    if (target.dataset.action === "start-request") {
      const item = state.items.find(entry => entry.id === activeItemId);
      if (item) requestForm(item);
    }
    if (target.dataset.action === "back-to-item") openItemForm(activeItemId);
    if (target.dataset.action === "delete-item") deleteItem(target.dataset.itemId);
    if (target.dataset.action === "go-account") {
      closeModal();
      renderView("account");
    }
    if (target.dataset.action === "reset-data") resetData();
  });
  document.addEventListener("submit", event => {
    if (event.target.id === "registerForm") registerUser(event);
    else if (event.target.id === "loginForm") loginUser(event);
    else if (event.target.id === "reportForm") addItem(event);
    else if (event.target.id === "claimForm") submitClaim(event);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadFromStorage();
  if (localStorage.getItem(THEME_KEY) === "light") document.body.classList.add("light");
  bindEvents();
  updateUserInterface();
  if (state.currentUser) showPortal();
  else showLanding();
});
