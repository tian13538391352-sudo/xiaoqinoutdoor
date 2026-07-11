// Xiaoqin Outdoor CMS - Admin Panel
// ============================================

const GITHUB_OWNER = 'tian13538391352-sudo';
const GITHUB_REPO = 'xiaoqinoutdoor';
const GITHUB_BRANCH = 'main';
const API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

let githubToken = '';
let currentTab = 'products';
let productsData = [];
let pagesData = {};

// ============================================
// Login System
// ============================================
function login() {
  const pw = document.getElementById('adminPassword').value;
  const err = document.getElementById('loginError');
  
  if (!pw) { err.textContent = '请输入密码'; return; }
  
  // The password is actually the GitHub Personal Access Token
  // Simple validation: GitHub tokens start with 'ghp_' or 'github_pat_'
  if (pw.startsWith('ghp_') || pw.startsWith('github_pat_')) {
    githubToken = pw;
    // Verify the token works
    fetch(`${API_BASE}`, {
      headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
    })
    .then(r => {
      if (!r.ok) throw new Error('Token 无效或已过期');
      return r.json();
    })
    .then(() => {
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      showTab('products');
      toast('登录成功', 'success');
    })
    .catch(e => {
      err.textContent = 'Token 无效，请检查后重试';
    });
  } else {
    err.textContent = '请输入 GitHub Personal Access Token（以 ghp_ 开头）';
  }
  
  // Also show hint about getting a token
  document.getElementById('setupHint').textContent = '密码为 GitHub Token → Settings → Developer settings → Tokens';
}

function logout() {
  githubToken = '';
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

// ============================================
// Tab Navigation
// ============================================
function showTab(tab) {
  currentTab = tab;
  
  // Update sidebar active
  document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
  event.target.classList.add('active');
  
  const titles = { products: '产品管理', pages: '页面内容', images: '图片管理', settings: '设置' };
  document.getElementById('tabTitle').textContent = titles[tab];
  
  switch(tab) {
    case 'products': loadProducts(); break;
    case 'pages': loadPages(); break;
    case 'images': renderImageManager(); break;
    case 'settings': renderSettings(); break;
  }
}

// ============================================
// Product Management
// ============================================
function loadProducts() {
  // Fetch all product HTML files
  fetch(`${API_BASE}/contents/products?ref=${GITHUB_BRANCH}`, {
    headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
  })
  .then(r => r.json())
  .then(files => {
    // Parse product data from filenames
    productsData = files
      .filter(f => f.name.endsWith('.html'))
      .map(f => ({
        filename: f.name,
        path: f.path,
        sha: f.sha,
        name: prettifyName(f.name),
        imageUrl: '',
        specs: {},
        material: '',
        description: ''
      }));
    
    // Fetch content for each product
    Promise.all(productsData.map(p => 
      fetch(`${API_BASE}/contents/${p.path}?ref=${GITHUB_BRANCH}`, {
        headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
      })
      .then(r => r.json())
      .then(data => {
        const content = atob(data.content);
        p.sha = data.sha;
        // Extract image URL
        const imgMatch = content.match(/<img\s+src="([^"]+)"\s+alt="([^"]*)"/i);
        if (imgMatch) { p.imageUrl = imgMatch[1]; p.altText = imgMatch[2]; }
        // Extract material
        const matMatch = content.match(/Material<\/strong>:\s*([^<]+)/i);
        if (matMatch) p.material = matMatch[1].trim();
        // Extract specs
        const specMatches = content.matchAll(/<tr><t[hd]>(.+?)<\/t[hd]><t[hd]>(.+?)<\/t[hd]><\/tr>/gi);
        for (const m of specMatches) {
          const key = m[1].replace(/<[^>]+>/g, '').trim();
          const val = m[2].replace(/<[^>]+>/g, '').trim();
          if (key !== 'Material') p.specs[key] = val;
        }
        // Extract h1
        const h1Match = content.match(/<h1>(.+?)<\/h1>/i);
        if (h1Match) p.name = h1Match[1].trim();
        return p;
      })
    ))
    .then(updated => {
      productsData = updated;
      renderProductList();
    });
  })
  .catch(e => {
    document.getElementById('tabContent').innerHTML = 
      '<div class="card"><p style="color:red;">加载失败: ' + e.message + '</p></div>';
  });
}

function renderProductList() {
  let html = '';
  
  if (selectedProduct) {
    html = renderProductEditor(selectedProduct);
  } else {
    html = '<div class="card"><h3>全部产品 (' + productsData.length + ')</h3>';
    html += '<div class="product-list">';
    productsData.forEach((p, i) => {
      html += '<div class="product-item" onclick="selectProduct(' + i + ')">';
      html += '<span class="name">' + p.name + '</span>';
      html += '<span class="spec">' + p.material.substring(0, 30) + '</span>';
      html += '<span style="font-size:0.8rem;color:#888;">点击编辑 →</span>';
      html += '</div>';
    });
    html += '</div></div>';
  }
  
  document.getElementById('tabContent').innerHTML = html;
}

let selectedProduct = null;

function selectProduct(index) {
  selectedProduct = productsData[index];
  renderProductList();
}

function backToList() {
  selectedProduct = null;
  renderProductList();
}

function renderProductEditor(p) {
  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h3>编辑: ${p.name}</h3>
        <button class="btn btn-outline btn-sm" onclick="backToList()">← 返回列表</button>
      </div>
      <div class="form-group">
        <label>产品名称</label>
        <input id="prodName" value="${escapeHtml(p.name)}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>材质 Material</label>
          <input id="prodMaterial" value="${escapeHtml(p.material)}">
        </div>
        <div class="form-group">
          <label>图片 URL</label>
          <input id="prodImage" value="${escapeHtml(p.imageUrl)}" oninput="previewImage(this.value)">
        </div>
      </div>
      ${p.imageUrl ? `<img src="${p.imageUrl}" class="image-preview" id="imagePreview" onerror="this.style.display='none'">` : ''}
      <div class="form-group" style="margin-top:1rem;">
        <label>产品描述</label>
        <textarea id="prodDesc" rows="3">${escapeHtml(p.description)}</textarea>
      </div>
      <h4 style="margin:1rem 0 0.5rem;">规格参数</h4>
      <div class="form-row-3">
        ${Object.entries(p.specs).map(([k, v]) => `
          <div class="form-group">
            <label>${k}</label>
            <input class="prodSpec" data-key="${escapeHtml(k)}" value="${escapeHtml(v)}">
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary" onclick="saveProduct('${p.path}')" style="margin-top:1rem;">💾 保存此产品</button>
    </div>
  `;
}

function saveProduct(path) {
  const p = selectedProduct;
  const name = document.getElementById('prodName').value;
  const material = document.getElementById('prodMaterial').value;
  const imageUrl = document.getElementById('prodImage').value;
  const desc = document.getElementById('prodDesc').value;
  
  let specsHTML = '';
  document.querySelectorAll('.prodSpec').forEach(inp => {
    specsHTML += `<tr><th>${inp.dataset.key}</th><td>${inp.value}</td></tr>\n`;
  });
  
  const materialLabel = material ? 
    `<span class="product-detail-material">${material}</span>` : '';
  
  const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${name} — premium camping gear from Xiaoqin Outdoor. ${material}. OEM/ODM available.">
  <meta name="keywords" content="${name.toLowerCase()}, camping mat, outdoor gear, ${material.toLowerCase()}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://xiaoqinoutdoor.com/${path}">
  <title>${name} — Xiaoqin Outdoor</title>
  <link rel="stylesheet" href="../css/style.css">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%231a5632'/><text x='16' y='22' font-size='18' fill='white' font-weight='bold' text-anchor='middle'>XO</text></svg>">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "${name}",
    "description": "${desc || name}",
    "brand": { "@type": "Brand", "name": "Xiaoqin Outdoor" },
    "offers": { "@type": "Offer", "availability": "https://schema.org/InStock" }
  }
  </script>
</head>
<body>
<header class="site-header">
  <div class="header-inner">
    <a href="../index.html" class="logo"><span class="logo-icon">XO</span><span>Xiaoqin Outdoor</span></a>
    <nav class="main-nav">
      <a href="../index.html">Home</a><a href="../products.html">Products</a><a href="../factory.html">Factory</a>
      <a href="../oem.html">OEM/ODM</a><a href="../blog.html">Blog</a><a href="../faq.html">FAQ</a>
      <a href="../download.html">Download</a><a href="../contact.html" class="nav-cta">Inquiry</a>
    </nav>
    <button class="mobile-menu-btn" aria-label="Toggle menu"><span></span><span></span><span></span></button>
  </div>
</header>
<nav class="breadcrumb">
  <div style="max-width:var(--max-width);margin:0 auto;padding:0 var(--spacing-xl)">
    <a href="../index.html">Home</a> <span class="separator">›</span> <a href="../products.html">Products</a> <span class="separator">›</span> <strong>${name}</strong>
  </div>
</nav>
<section class="section">
  <div class="section-inner">
    <div class="product-detail">
      <div class="product-detail-image">
        <img src="${imageUrl}" alt="${name}" loading="eager">
      </div>
      <div class="product-detail-info">
        ${materialLabel}
        <h1>${name}</h1>
        <p class="product-detail-desc">${desc}</p>
        <table class="specs-table">${specsHTML}</table>
        ${material ? '<div class="customization-badge">🎨 Color and specifications can be customized</div>' : ''}
        <div class="b2b-features">
          <div class="b2b-feature-item"><span class="check">✓</span> OEM/ODM customization available</div>
          <div class="b2b-feature-item"><span class="check">✓</span> Factory-direct pricing</div>
          <div class="b2b-feature-item"><span class="check">✓</span> AQL 2.5 quality inspection</div>
          <div class="b2b-feature-item"><span class="check">✓</span> Flexible MOQ for trial orders</div>
        </div>
        <div style="margin-top:var(--spacing-xl);">
          <a href="../contact.html" class="btn btn-primary btn-lg">Inquire About This Product</a>
          <a href="../products.html" class="btn btn-outline" style="color:var(--color-text);border-color:var(--color-border);margin-left:var(--spacing-md);">← Back to Products</a>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="cta-banner">
  <h2>Ready to Order or Customize?</h2>
  <p>Get pricing, request samples, or discuss OEM customization.</p>
  <a href="../contact.html" class="btn btn-primary btn-lg">Send Inquiry Now</a>
</section>
<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-col"><h3>Xiaoqin Outdoor</h3><p>Yiwu Xiaoqin Electronic Commerce Co., Ltd.</p></div>
    <div class="footer-col"><h3>Links</h3><ul><li><a href="../index.html">Home</a></li><li><a href="../products.html">Products</a></li><li><a href="../contact.html">Contact</a></li></ul></div>
  </div>
  <div class="footer-bottom"><p>&copy; 2026 Yiwu Xiaoqin Electronic Commerce Co., Ltd.</p></div>
</footer>
<script src="../js/main.js"><\/script>
</body>
</html>`;

  // Save to GitHub
  saveFileToGithub(path, content, p.sha, `${name} 已更新`);
}

// ============================================
// Page Content Editor
// ============================================
function loadPages() {
  const pages = [
    { name: '首页 Hero', path: 'index.html', fields: ['title', 'subtitle', 'heroImage'] },
    { name: '首页 Why Us', path: 'index.html', fields: [] },
    { name: '工厂实力', path: 'factory.html', fields: [] },
    { name: 'OEM/ODM', path: 'oem.html', fields: [] },
    { name: '联系页面', path: 'contact.html', fields: [] }
  ];
  
  let html = '';
  pages.forEach((page, i) => {
    html += `
    <div class="card">
      <h3>📄 ${page.name}</h3>
      <p style="color:var(--text2);font-size:0.85rem;margin:0.5rem 0;">文件: ${page.path}</p>
      <button class="btn btn-outline btn-sm" onclick="editPageContent('${page.path}', '${page.name}')">编辑内容</button>
    </div>`;
  });
  
  document.getElementById('tabContent').innerHTML = html;
}

function editPageContent(path, name) {
  // Fetch the page content
  fetch(`${API_BASE}/contents/${path}?ref=${GITHUB_BRANCH}`, {
    headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
  })
  .then(r => r.json())
  .then(data => {
    const content = atob(data.content);
    const html = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h3>编辑: ${name}</h3>
        <button class="btn btn-outline btn-sm" onclick="loadPages()">← 返回</button>
      </div>
      <div class="form-group">
        <label>HTML 源码（可直接修改）</label>
        <textarea id="pageContent" rows="30" style="font-family:monospace;font-size:0.8rem;">${escapeHtml(content)}</textarea>
      </div>
      <button class="btn btn-primary" onclick="savePageContent('${path}')">💾 保存</button>
      <p style="font-size:0.75rem;color:red;margin-top:0.5rem;">⚠️ 直接修改 HTML 源码，请谨慎操作。建议先备份。</p>
    </div>`;
    document.getElementById('tabContent').innerHTML = html;
  });
}

function savePageContent(path) {
  const content = document.getElementById('pageContent').value;
  saveFileToGithub(path, content, null, '页面内容已更新');
}

// ============================================
// Image Manager
// ============================================
function renderImageManager() {
  document.getElementById('tabContent').innerHTML = `
    <div class="card">
      <h3>🖼️ 图片管理</h3>
      <p style="margin:1rem 0;color:var(--text2);">
        上传图片到 <code>/images/</code> 目录，然后在产品编辑中使用
        <code>images/your-file.jpg</code> 作为图片URL。
      </p>
      <div class="form-group">
        <label>选择图片文件</label>
        <input type="file" id="imageFile" accept="image/*" style="padding:0.5rem 0;">
      </div>
      <button class="btn btn-primary" onclick="uploadImage()">📤 上传图片</button>
      <div id="uploadStatus" style="margin-top:1rem;"></div>
    </div>
    <div class="card">
      <h3>已上传图片</h3>
      <div id="imageList">加载中...</div>
    </div>
  `;
  
  // Load existing images
  fetch(`${API_BASE}/contents/images?ref=${GITHUB_BRANCH}`, {
    headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
  })
  .then(r => {
    if (!r.ok) {
      document.getElementById('imageList').innerHTML = '<p>还没有上传图片</p>';
      return;
    }
    return r.json();
  })
  .then(files => {
    if (!files || !files.length) {
      document.getElementById('imageList').innerHTML = '<p>还没有上传图片</p>';
      return;
    }
    let html = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;">';
    files.forEach(f => {
      const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${f.path}`;
      html += `
      <div style="text-align:center;padding:0.5rem;border:1px solid var(--border);border-radius:var(--radius);">
        <img src="${url}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;">
        <p style="font-size:0.75rem;color:var(--text2);margin-top:0.25rem;">${f.name}</p>
        <button class="btn btn-outline btn-sm" onclick="copyToClipboard('images/${f.name}')">复制路径</button>
      </div>`;
    });
    html += '</div>';
    document.getElementById('imageList').innerHTML = html;
  })
  .catch(() => {
    document.getElementById('imageList').innerHTML = '<p>加载失败</p>';
  });
}

function uploadImage() {
  const fileInput = document.getElementById('imageFile');
  const file = fileInput.files[0];
  if (!file) { toast('请选择文件', 'error'); return; }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Content = e.target.result.split(',')[1];
    const path = `images/${file.name}`;
    
    // Check if file exists first
    fetch(`${API_BASE}/contents/${path}?ref=${GITHUB_BRANCH}`, {
      headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
    })
    .then(r => {
      if (r.ok) return r.json().then(d => d.sha);
      return null;
    })
    .then(existingSha => {
      const body = {
        message: `Upload ${file.name}`,
        content: base64Content,
        branch: GITHUB_BRANCH
      };
      if (existingSha) body.sha = existingSha;
      
      return fetch(`${API_BASE}/contents/${path}`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify(body)
      });
    })
    .then(r => r.json())
    .then(data => {
      if (data.content) {
        toast('图片上传成功！路径: images/' + file.name, 'success');
        document.getElementById('uploadStatus').innerHTML = 
          `<p style="color:green;">✅ 上传成功！<br>URL: <code>images/${file.name}</code><br>
          完整链接: <code>https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/images/${file.name}</code></p>`;
        renderImageManager(); // Refresh list
      } else {
        toast('上传失败: ' + (data.message || '未知错误'), 'error');
      }
    })
    .catch(e => {
      toast('上传失败: ' + e.message, 'error');
    });
  };
  reader.readAsDataURL(file);
}

// ============================================
// Settings
// ============================================
function renderSettings() {
  document.getElementById('tabContent').innerHTML = `
    <div class="card">
      <h3>⚙️ 系统信息</h3>
      <div style="margin:1rem 0;line-height:2;">
        <p><strong>GitHub 仓库:</strong> <a href="https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}" target="_blank">${GITHUB_OWNER}/${GITHUB_REPO}</a></p>
        <p><strong>Vercel 部署:</strong> <a href="https://xiaoqinoutdoor.vercel.app" target="_blank">xiaoqinoutdoor.vercel.app</a></p>
        <p><strong>分支:</strong> ${GITHUB_BRANCH}</p>
        <p><strong>Token 状态:</strong> ${githubToken ? '✅ 已设置' : '❌ 未设置'}</p>
      </div>
    </div>
    <div class="card">
      <h3>📋 操作指南</h3>
      <ol style="margin:1rem 0 1rem 1.5rem;line-height:2;">
        <li>在<strong>产品管理</strong>中编辑产品信息、图片URL</li>
        <li>在<strong>图片管理</strong>中上传自己的产品图片</li>
        <li>上传后复制图片路径，粘贴到产品编辑的"图片 URL"字段</li>
        <li>点击<strong>保存修改</strong>提交到 GitHub</li>
        <li>点击<strong>立即部署</strong>让 Vercel 自动重新构建并上线</li>
      </ol>
    </div>
  `;
}

// ============================================
// GitHub File Operations
// ============================================
function saveFileToGithub(path, content, sha, message) {
  const body = {
    message: message || `Update ${path}`,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: GITHUB_BRANCH
  };
  
  // Need to get latest SHA for updates
  const getSha = sha ? Promise.resolve(sha) : 
    fetch(`${API_BASE}/contents/${path}?ref=${GITHUB_BRANCH}`, {
      headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
    })
    .then(r => r.json())
    .then(d => d.sha)
    .catch(() => null);
  
  getSha.then(latestSha => {
    if (latestSha) body.sha = latestSha;
    
    return fetch(`${API_BASE}/contents/${path}`, {
      method: 'PUT',
      headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' },
      body: JSON.stringify(body)
    });
  })
  .then(r => r.json())
  .then(data => {
    if (data.commit) {
      toast('✅ 已保存到 GitHub！', 'success');
      backToList();
      loadProducts();
    } else {
      toast('❌ 保存失败: ' + (data.message || ''), 'error');
    }
  })
  .catch(e => toast('❌ 错误: ' + e.message, 'error'));
}

function saveAllChanges() {
  toast('请在具体产品中逐一保存。点击产品 → 编辑 → 保存。', 'error');
}

// ============================================
// Deploy
// ============================================
function deployNow() {
  // Vercel auto-deploys when GitHub is connected
  // If not connected, trigger via Vercel Deploy Hook
  fetch(`${API_BASE}/dispatches`, {
    method: 'POST',
    headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' },
    body: JSON.stringify({ event_type: 'deploy' })
  })
  .then(r => {
    if (r.ok) {
      toast('🚀 已触发部署！Vercel 正在重新构建，约1-2分钟后生效。', 'success');
    } else {
      // Fallback: trigger Vercel via deploy hook
      toast('💡 代码已保存到 GitHub。请在 Vercel Dashboard 中关联 GitHub 仓库实现自动部署。', 'success');
    }
  })
  .catch(() => {
    toast('💡 Vercel 关联 GitHub 后可自动部署。当前可手动运行: npx vercel --prod', 'success');
  });
}

// ============================================
// Utilities
// ============================================
function prettifyName(filename) {
  return filename.replace('.html', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    toast('已复制: ' + text, 'success');
  });
}

function toast(message, type) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function previewImage(url) {
  const preview = document.getElementById('imagePreview');
  if (preview) {
    preview.src = url;
    preview.style.display = 'block';
    preview.onerror = () => { preview.style.display = 'none'; };
  }
}

// Auto-expand textarea
document.addEventListener('input', function(e) {
  if (e.target.tagName === 'TEXTAREA') {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  }
});
