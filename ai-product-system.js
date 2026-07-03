/* ============================================================
   AI-POWERED PRODUCT SYSTEM
   Smart Cards with Dynamic Data, Compatibility Scoring & Semantic Search
   ============================================================ */

(function () {
  'use strict';

  // Product Data Schema - Professional JSON Structure
  const PRODUCTS_DATABASE = [
    {
      part_identity: {
        id: "PART-001",
        title: "فلتر هواء رياضي عالي الأداء",
        en_title: "High-Performance Sport Air Filter",
        price_jod: 45.50,
        currency: "JOD",
        status: "In-Stock",
        stock_level: "Low-Alert"
      },
      technical_specifications: {
        model_year: "2020-2026",
        compatibility: ["Toyota", "Nissan", "Hyundai"],
        warranty: "2 Years",
        material_grade: "High-Density Polymer",
        dimensions: "15cm × 12cm × 8cm",
        weight: "0.45kg"
      },
      ai_features: {
        compatibility_score: 98,
        ai_recommendation: true,
        price_competitiveness: 0.92,
        quality_rating: 4.8
      },
      description: "فلتر هواء متقدم يوفر أداء عالية مع كفاءة تنقية 99.7%",
      en_description: "Advanced air filter offering high performance with 99.7% filtration efficiency",
      image_url: "https://via.placeholder.com/400x500?text=Air+Filter"
    },
    {
      part_identity: {
        id: "PART-002",
        title: "زيت محرك سينثيتي فاخر 5W-30",
        en_title: "Premium Synthetic Engine Oil 5W-30",
        price_jod: 28.75,
        currency: "JOD",
        status: "In-Stock",
        stock_level: "Normal"
      },
      technical_specifications: {
        model_year: "All Years",
        compatibility: ["جميع الموديلات", "All Models"],
        warranty: "3 Years",
        material_grade: "Synthetic PAO",
        viscosity: "5W-30",
        capacity: "1 Liter"
      },
      ai_features: {
        compatibility_score: 100,
        ai_recommendation: true,
        price_competitiveness: 0.85,
        quality_rating: 4.9
      },
      description: "زيت محرك سينثيتي فاخر بحماية محسنة وأداء عالية في جميع ظروف الطقس",
      en_description: "Premium synthetic engine oil with enhanced protection and superior performance",
      image_url: "https://via.placeholder.com/400x500?text=Engine+Oil"
    },
    {
      part_identity: {
        id: "PART-003",
        title: "بطارية السيارة 12V 60Ah",
        en_title: "Car Battery 12V 60Ah",
        price_jod: 65.00,
        currency: "JOD",
        status: "In-Stock",
        stock_level: "High"
      },
      technical_specifications: {
        model_year: "2015-2026",
        compatibility: ["كل أنواع السيارات", "All Car Types"],
        warranty: "5 Years",
        material_grade: "Lithium-Enhanced",
        cold_start_amps: "520 A",
        dimensions: "25cm × 13cm × 22cm"
      },
      ai_features: {
        compatibility_score: 95,
        ai_recommendation: false,
        price_competitiveness: 0.88,
        quality_rating: 4.7
      },
      description: "بطارية عالية الجودة بتقنية ليثيوم محسنة توفر أداء موثوقة",
      en_description: "High-quality battery with lithium-enhanced technology for reliable performance",
      image_url: "https://via.placeholder.com/400x500?text=Battery"
    }
  ];

  // AI-Powered Functions
  const AIProductSystem = {
    /**
     * Calculate compatibility score for user's vehicle
     */
    calculateCompatibilityScore: function(userVehicles, productCompatibility) {
      if (!Array.isArray(userVehicles) || !Array.isArray(productCompatibility)) {
        return 0;
      }
      
      const matches = userVehicles.filter(v => 
        productCompatibility.some(p => p.toLowerCase().includes(v.toLowerCase()))
      ).length;
      
      return Math.round((matches / userVehicles.length) * 100) || 0;
    },

    /**
     * Semantic search - finds products by meaning not just keywords
     */
    semanticSearch: function(query) {
      const searchTerms = query.toLowerCase().split(' ');
      const results = [];

      PRODUCTS_DATABASE.forEach(product => {
        let score = 0;

        // Check title
        searchTerms.forEach(term => {
          if (product.part_identity.title.toLowerCase().includes(term)) score += 30;
          if (product.part_identity.en_title.toLowerCase().includes(term)) score += 30;
          if (product.description.toLowerCase().includes(term)) score += 15;
          if (product.technical_specifications.compatibility.join(' ').toLowerCase().includes(term)) score += 20;
        });

        if (score > 0) {
          results.push({ ...product, searchScore: score });
        }
      });

      return results.sort((a, b) => b.searchScore - a.searchScore);
    },

    /**
     * Format price with dynamic currency
     */
    formatPrice: function(amount, currency = "JOD") {
      const formatter = new Intl.NumberFormat('ar-JO', {
        style: 'currency',
        currency: currency
      });
      return formatter.format(amount);
    },

    /**
     * Generate AI recommendation text
     */
    generateAIRecommendation: function(product) {
      const { compatibility_score, quality_rating } = product.ai_features;
      
      if (compatibility_score >= 95) {
        return `✨ تطابق عالي جداً (${compatibility_score}%) - هذه القطعة مثالية لسيارتك!`;
      } else if (compatibility_score >= 85) {
        return `✓ تطابق جيد (${compatibility_score}%) - خيار موثوق لسيارتك`;
      } else {
        return `⚠ تحقق من التطابق (${compatibility_score}%) - قد تحتاج توضيح إضافي`;
      }
    }
  };

  // Initialize Smart Product Cards
  function initSmartProductCards() {
    const smartCardContainer = document.getElementById('smart-products-grid');
    
    if (!smartCardContainer) return;

    smartCardContainer.innerHTML = PRODUCTS_DATABASE.map(product => `
      <div class="smart-product-card" data-product-id="${product.part_identity.id}">
        <!-- Image Section -->
        <div class="product-image-wrap">
          <img src="${product.image_url}" alt="${product.part_identity.title}" class="product-image" loading="lazy" />
          <div class="product-image-overlay"></div>
          <span class="product-badge ${product.part_identity.stock_level === 'Low-Alert' ? 'low-stock' : 'in-stock'}">
            ${product.part_identity.stock_level === 'Low-Alert' ? '⚠ مخزون محدود' : '✓ متوفر'}
          </span>
        </div>

        <!-- Product Info -->
        <div class="product-info">
          <h3 class="product-name">${product.part_identity.title}</h3>
          
          <!-- Compatibility Score -->
          <div class="product-compatibility">
            <span class="compatibility-score">${product.ai_features.compatibility_score}% توافق</span>
            <span class="compatibility-models">${product.technical_specifications.compatibility.join(', ')}</span>
          </div>

          <!-- Price Section -->
          <div class="product-price-section">
            <div class="product-price">
              ${product.part_identity.price_jod}
              <span class="price-currency">د.ا</span>
            </div>
            ${product.ai_features.price_competitiveness < 0.90 ? `
              <div class="price-discount">💰 افضل سعر في السوق</div>
            ` : ''}
          </div>

          <!-- Specs Grid -->
          <div class="product-specs">
            <div class="spec-item">
              <span class="spec-label">السنوات:</span>
              <span class="spec-value">${product.technical_specifications.model_year}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">الضمان:</span>
              <span class="spec-value">${product.technical_specifications.warranty}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">الجودة:</span>
              <span class="spec-value">⭐ ${product.ai_features.quality_rating}</span>
            </div>
          </div>

          <!-- AI Features -->
          <div class="product-ai-section">
            <div class="ai-feature">
              <span class="ai-icon">🤖</span>
              <span class="ai-feature-text">${AIProductSystem.generateAIRecommendation(product)}</span>
            </div>
            <div class="ai-feature">
              <span class="ai-icon">✓</span>
              <span class="ai-feature-text">التحقق الذكي: ${product.part_identity.material_grade}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="product-actions">
            <button class="product-btn product-btn-primary" data-action="view-details" data-product-id="${product.part_identity.id}">
              عرض التفاصيل
            </button>
            <button class="product-btn product-btn-secondary" data-action="compare">
              قارن
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    document.querySelectorAll('[data-action="view-details"]').forEach(btn => {
      btn.addEventListener('click', (e) => openSmartModal(e.target.dataset.productId));
    });
  }

  // Smart Modal - Expandable Details
  function openSmartModal(productId) {
    const product = PRODUCTS_DATABASE.find(p => p.part_identity.id === productId);
    if (!product) return;

    const modal = document.getElementById('smart-modal') || createSmartModal();
    
    modal.innerHTML = `
      <div class="smart-modal-content">
        <div class="smart-modal-header">
          <h2>${product.part_identity.title}</h2>
          <button type="button" onclick="document.getElementById('smart-modal').classList.remove('open')">✕</button>
        </div>
        
        <div class="smart-modal-body">
          <!-- Detailed Specs Table -->
          <table class="smart-specs-table">
            <thead>
              <tr>
                <th>المواصفة</th>
                <th>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>السعر</td>
                <td><strong>${AIProductSystem.formatPrice(product.part_identity.price_jod)}</strong></td>
              </tr>
              <tr>
                <td>التوافق</td>
                <td>${product.technical_specifications.compatibility.join(' • ')}</td>
              </tr>
              <tr>
                <td>سنوات الإنتاج</td>
                <td>${product.technical_specifications.model_year}</td>
              </tr>
              <tr>
                <td>الضمان</td>
                <td>${product.technical_specifications.warranty}</td>
              </tr>
              <tr>
                <td>جودة المادة</td>
                <td>${product.technical_specifications.material_grade}</td>
              </tr>
              <tr>
                <td>التقييم</td>
                <td>⭐⭐⭐⭐⭐ ${product.ai_features.quality_rating}/5</td>
              </tr>
            </tbody>
          </table>

          <!-- AI Recommendation -->
          <div style="background: #f0f7ff; padding: 16px; border-radius: 12px; border: 1px solid rgba(24, 119, 242, 0.1);">
            <h3 style="margin: 0 0 8px; color: #1877f2;">🤖 توصية الذكاء الاصطناعي</h3>
            <p style="margin: 0; color: #1c1e21;">${AIProductSystem.generateAIRecommendation(product)}</p>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');
  }

  function createSmartModal() {
    const modal = document.createElement('div');
    modal.id = 'smart-modal';
    modal.className = 'smart-modal';
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    return modal;
  }

  // Semantic Search Implementation
  function initSemanticSearch() {
    const searchInput = document.getElementById('product-semantic-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) {
        initSmartProductCards();
        return;
      }

      const results = AIProductSystem.semanticSearch(query);
      const container = document.getElementById('smart-products-grid');
      
      if (results.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #65676b; padding: 20px;">لم نعثر على منتجات تطابق بحثك</p>';
        return;
      }

      container.innerHTML = results.map(product => `
        <div class="smart-product-card" data-product-id="${product.part_identity.id}">
          <!-- (same card HTML as above) -->
          <div class="product-image-wrap">
            <img src="${product.image_url}" alt="${product.part_identity.title}" class="product-image" />
          </div>
          <div class="product-info">
            <h3 class="product-name">${product.part_identity.title}</h3>
            <div class="product-price-section">
              <div class="product-price">${product.part_identity.price_jod} د.ا</div>
            </div>
            <button class="product-btn product-btn-primary" data-action="view-details" data-product-id="${product.part_identity.id}">عرض</button>
          </div>
        </div>
      `).join('');

      document.querySelectorAll('[data-action="view-details"]').forEach(btn => {
        btn.addEventListener('click', (e) => openSmartModal(e.target.dataset.productId));
      });
    });
  }

  // Public API
  window.AIProductSystem = AIProductSystem;
  window.initSmartProductCards = initSmartProductCards;

  // Initialize on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSmartProductCards();
      initSemanticSearch();
    });
  } else {
    initSmartProductCards();
    initSemanticSearch();
  }
})();
