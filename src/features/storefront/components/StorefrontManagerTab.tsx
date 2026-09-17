import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Search,
  ExternalLink,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  AlertTriangle,
  ArrowUpDown,
  Tag,
  ImageIcon,
  Sparkles,
  Eye,
  EyeOff,
  Layers,
  Filter,
  Download,
  Share2,
  RefreshCw,
  Award,
  Zap,
  DollarSign,
  TrendingUp,
  Percent,
  SlidersHorizontal,
  ChevronRight,
  Globe,
  Star,
  Check,
  X,
  CreditCard,
  Building2,
  Compass,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Palette,
  Phone,
  Mail,
  MapPin,
  FileText,
  Printer,
  Copy,
  Upload,
  Save,
  FolderUp,
  FileImage
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { InventoryItem } from '@/src/types';

interface StorefrontManagerTabProps {
  role?: string | null;
}

const PRESET_BADGES = [
  'ATL APPROVED',
  'FLAGSHIP KIT',
  'BEST SELLER',
  'EARLY LEARNING',
  'NEW ARRIVAL',
  'NEP 2020 ALIGNED',
  'NONE'
];

const PRESET_GRADES = [
  'Grades 1–5 (Early STEM)',
  'Grades 6–10 (Middle School)',
  'Grades 8–12 (High School)',
  'ATL Makerspace (Ages 10+)',
  'All Grades (K-12)'
];

const STEM_PRESET_IMAGES = [
  { label: 'STEM Kit Master', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80' },
  { label: 'Electronics & Robotics', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80' },
  { label: '3D Geometry Tool', url: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=800&auto=format&fit=crop&q=80' },
  { label: 'Optics & Physics Bench', url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80' },
  { label: 'Chemistry Labware', url: 'https://images.unsplash.com/photo-1603555501671-8f96b3fce8b4?w=800&auto=format&fit=crop&q=80' },
  { label: 'Classroom Demonstration', url: 'https://images.unsplash.com/photo-1603555501671-8f96b3fce8b4?w=800&auto=format&fit=crop&q=80' }
];

export default function StorefrontManagerTab({ role }: StorefrontManagerTabProps) {
  const {
    inventory = [],
    customerOrders = [],
    updateInventoryItem,
    deleteInventoryItem,
    updateCustomerOrderStatus,
    updateCustomerOrderFulfillment,
    refreshCustomerOrders
  } = useData();

  const { showToast } = useToast();

  // Active Sub-Tab: 'merchandising' | 'orders' | 'cms'
  const [activeSubTab, setActiveSubTab] = useState<'merchandising' | 'orders' | 'cms'>('merchandising');

  // Active CMS section: 'announcement' | 'hero' | 'usps' | 'curriculum' | 'testimonials' | 'faqs' | 'theme'
  const [activeCmsSection, setActiveCmsSection] = useState<'announcement' | 'hero' | 'usps' | 'curriculum' | 'testimonials' | 'faqs' | 'theme'>('announcement');

  // Search & Filters for Products
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState<'ALL' | 'PUBLISHED' | 'HIDDEN' | 'FEATURED'>('ALL');

  // Orders Search & Filter
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [selectedOrderForPackingSlip, setSelectedOrderForPackingSlip] = useState<any | null>(null);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<any | null>(null);
  const [orderCarrierInput, setOrderCarrierInput] = useState('Delhivery Express');
  const [orderTrackingInput, setOrderTrackingInput] = useState('');
  const [orderNotesInput, setOrderNotesInput] = useState('');
  const [orderFulfillmentSaving, setOrderFulfillmentSaving] = useState(false);

  // Full Product Edit Modal State
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: '',
    basePrice: 0,
    comparePrice: 0,
    imageUrl: '',
    isSellable: true,
    isHidden: false,
    badge: 'ATL APPROVED',
    gradeLevel: 'Grades 6–10 (Middle School)',
    stockQty: 0,
    unit: 'pcs',
    threshold: 5,
    sku: ''
  });

  // Quick Image Modal State
  const [imageModalItem, setImageModalItem] = useState<InventoryItem | null>(null);
  const [customImageUrlInput, setCustomImageUrlInput] = useState('');
  const [imageModalTab, setImageModalTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [imageFileSize, setImageFileSize] = useState<string>('');
  const [imageFileError, setImageFileError] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Full Edit Modal Image Tab State
  const [editFormImageTab, setEditFormImageTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const editFormFileInputRef = useRef<HTMLInputElement>(null);

  // Inline Editing Local Overrides State (for instant responsive typing before blur/enter save)
  const [inlinePrices, setInlinePrices] = useState<Record<string, number>>({});
  const [inlineStocks, setInlineStocks] = useState<Record<string, number>>({});
  const [inlineNames, setInlineNames] = useState<Record<string, string>>({});
  const [editingNameId, setEditingNameId] = useState<string | null>(null);

  // Featured Product IDs in LocalStorage
  const [featuredIds, setFeaturedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('storefront_featured_ids');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return ['EXP-KIT-GEO', 'EXP-KIT-PSL', 'EXP-KIT-PRASTUTI', 'EXP-KIT-ROBO'];
  });

  // CMS Settings State
  const [cmsConfig, setCmsConfig] = useState<any>({
    announcement: {
      isVisible: true,
      text: "🎉 National Science Day Special: Free Activity Workbooks with all ExperiMind Labs STEM Kits! Pan-India Delivery.",
      discountCode: "EXPERIMIND10",
      linkUrl: "/catalog",
      badge: "Limited Offer"
    },
    hero: {
      eyebrowBadge: "🔬 Research-First Experiential STEM Education",
      headline: "Transform Abstract Science & Math into Hands-on Discovery",
      subtitle: "Engineered by cognitive researchers and master educators at ExperiMind Labs. Trusted by 250+ premier ATL schools, makerspaces, and curious students across India.",
      primaryCtaText: "Explore STEM Catalog",
      primaryCtaLink: "/catalog",
      secondaryCtaText: "Browse ATL Kits",
      secondaryCtaLink: "/catalog?category=STEM%20Kits",
      showcaseImageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80",
      trustMetrics: [
        { label: "Active School Labs", value: "250+" },
        { label: "Precision STEM Tools", value: "320+" },
        { label: "Student Hours Inspired", value: "50k+" },
        { label: "NEP 2020 Aligned", value: "100%" }
      ]
    },
    usps: [
      {
        id: "usp_1",
        icon: "Award",
        title: "National Award-Winning Pedagogy",
        description: "Rooted in constructivist cognitive learning models to build deep spatial and empirical intuition."
      },
      {
        id: "usp_2",
        icon: "ShieldCheck",
        title: "Lab-Grade Calibration & Safety",
        description: "Non-toxic, high-durability apparatus built for thousands of hours of intense classroom exploration."
      },
      {
        id: "usp_3",
        icon: "BookOpen",
        title: "Complete Curriculum Manuals",
        description: "Every kit includes graded step-by-step visual guides, theory primers, and real-world project challenges."
      },
      {
        id: "usp_4",
        icon: "Truck",
        title: "Direct Lab Dispatch & Warranty",
        description: "Dispatched from our Karnataka central technical warehouse with institutional GST invoices and prompt support."
      }
    ],
    curriculum: [
      {
        grade: "Grades 1–5",
        title: "Anubhav Sensory Science",
        focus: "Curiosity, tactile observation, elementary optics, color synthesis, and foundational balance mechanics."
      },
      {
        grade: "Grades 6–8",
        title: "Middle School Exploration",
        focus: "3D Geomagic spatial math, circuit building, electromagnetism, ray optics, and density labs."
      },
      {
        grade: "Grades 9–10",
        title: "Secondary Lab Sciences",
        focus: "Rigorous physics mechanics, chemical reaction labware, lens equations, and micro-measuring tools."
      },
      {
        grade: "Grades 11–12 & ATL",
        title: "Innovation & Robotics Hub",
        focus: "Microcontrollers, sensor fusion, IoT telemetry, prototype fabrication, and advanced apparatus."
      }
    ],
    testimonials: [
      {
        id: "t_1",
        name: "Dr. Sunita Rao",
        role: "Principal",
        institution: "Delhi Public School, Bangalore South",
        quote: "ExperiMind Labs kits have transformed our science periods. The Geomagic 3D kits made spatial geometry intuitive for even our most hesitant students.",
        rating: 5,
        verified: true
      },
      {
        id: "t_2",
        name: "Prof. Arvind Kulkarni",
        role: "ATL Lab Coordinator",
        institution: "Vidyaniketan National School",
        quote: "The durability and precision of ExperiMind Labs physical science modules are unmatched. Our students actively innovate rather than just reading theory.",
        rating: 5,
        verified: true
      },
      {
        id: "t_3",
        name: "Meera Nair",
        role: "Parent & Educator",
        institution: "Mysore STEM Circle",
        quote: "The activity guides are exceptionally well written. My 8th grader built an entire optics bench over the weekend and understood refraction effortlessly.",
        rating: 5,
        verified: true
      }
    ],
    faqs: [
      {
        id: "faq_1",
        question: "Are ExperiMind Labs kits aligned with CBSE, ICSE, and State board curricula?",
        answer: "Yes! All kits are mapped directly to NCERT and NEP 2020 experiential learning mandates for Grades 1 through 12, covering core physics, chemistry, biology, and applied mathematics."
      },
      {
        id: "faq_2",
        question: "Can educational institutions and ATL labs place bulk orders with institutional GST invoices?",
        answer: "Absolutely. We issue official B2B Tax Invoices with valid GSTIN and HSN codes, offering dedicated school lab pricing and educational dispatch terms."
      },
      {
        id: "faq_3",
        question: "What is the typical shipping timeline across India?",
        answer: "Standard orders are packed within 24 hours at our central lab warehouse and delivered within 3–5 business days via premier air courier partners (Delhivery, BlueDart, DTDC)."
      },
      {
        id: "faq_4",
        question: "What if a glass component or sensor arrives damaged?",
        answer: "We offer a 100% Zero-Hassle Replacement Guarantee. Simply contact our support team within 7 days of delivery with your order ID for immediate spare part dispatch."
      }
    ],
    theme: {
      accentColor: "indigo",
      schoolDispatchesEmail: "orders@experimindlabs.com",
      officialPhone: "+91 80 4123 9876",
      officeAddress: "ExperiMind Labs Pvt Ltd, Tech Research Park, Karnataka, India"
    }
  });

  const [cmsSaving, setCmsSaving] = useState(false);

  // Fetch live CMS from backend on mount
  useEffect(() => {
    fetch('/api/public/storefront/cms')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setCmsConfig((prev: any) => ({ ...prev, ...data }));
        }
      })
      .catch(err => console.warn('Could not load remote CMS:', err));
  }, []);

  // Unique Categories list from inventory
  const categories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((i) => {
      if (i.category && i.category.toLowerCase() !== 'box' && i.category.toLowerCase() !== 'others') {
        set.add(i.category);
      }
    });
    return Array.from(set).sort();
  }, [inventory]);

  // Storefront Metrics
  const publishedProducts = useMemo(() => {
    return inventory.filter((i) => (i.isSellable !== false) && !i.isHidden);
  }, [inventory]);

  const storefrontGmv = useMemo(() => {
    return customerOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
  }, [customerOrders]);

  const pendingFulfillments = useMemo(() => {
    return customerOrders.filter((o: any) => ['created', 'paid', 'packed'].includes(o.status)).length;
  }, [customerOrders]);

  // Filtered Products for Merchandising Table
  const filteredProducts = useMemo(() => {
    return inventory.filter((item) => {
      if (['box', 'others'].includes((item.category || '').toLowerCase())) return false;

      // Search Query
      if (productSearch.trim()) {
        const query = productSearch.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(query);
        const matchesSku = (item.barcode || item.sku || '').toLowerCase().includes(query);
        const matchesDesc = (item.description || '').toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesDesc) return false;
      }

      // Category Filter
      if (selectedCategory !== 'ALL' && (item.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Visibility Filter
      const isPublished = (item.isSellable !== false) && !item.isHidden;
      if (visibilityFilter === 'PUBLISHED' && !isPublished) return false;
      if (visibilityFilter === 'HIDDEN' && isPublished) return false;
      if (visibilityFilter === 'FEATURED' && !featuredIds.includes(item.id) && !featuredIds.includes(item.barcode || '')) return false;

      return true;
    });
  }, [inventory, productSearch, selectedCategory, visibilityFilter, featuredIds]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return customerOrders.filter((order: any) => {
      if (orderStatusFilter !== 'ALL' && order.status !== orderStatusFilter) return false;
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        const matchesName = (order.customer_name || '').toLowerCase().includes(q);
        const matchesEmail = (order.customer_email || '').toLowerCase().includes(q);
        const matchesPhone = (order.customer_phone || '').toLowerCase().includes(q);
        const matchesId = (order.id || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesId) return false;
      }
      return true;
    });
  }, [customerOrders, orderSearch, orderStatusFilter]);

  // ==========================================
  // INLINE ACTIONS & EDITING HANDLERS
  // ==========================================

  // 1. Toggle Storefront Visibility (Publish / Hide)
  const handleToggleSellable = async (item: InventoryItem) => {
    const currentlyPublished = (item.isSellable !== false) && !item.isHidden;
    const nextPublished = !currentlyPublished;

    try {
      await updateInventoryItem(item.id, {
        isSellable: nextPublished,
        isHidden: !nextPublished
      });
      showToast(
        nextPublished ? 'success' : 'info',
        nextPublished ? 'Product Published' : 'Product Hidden',
        `"${item.name}" is now ${nextPublished ? 'LIVE on shop.experimindlabs.com' : 'HIDDEN from storefront'}.`
      );
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    }
  };

  // 2. Toggle Featured Star
  const handleToggleFeatured = (id: string) => {
    let nextList: string[];
    if (featuredIds.includes(id)) {
      nextList = featuredIds.filter((x) => x !== id);
      showToast('info', 'Removed from Featured', 'Product unpinned from storefront spotlight carousel.');
    } else {
      nextList = [...featuredIds, id];
      showToast('success', 'Pinned to Featured', 'Product will appear in the top hero spotlight on shop.experimindlabs.com!');
    }
    setFeaturedIds(nextList);
    localStorage.setItem('storefront_featured_ids', JSON.stringify(nextList));
  };

  // 3. Inline Selling Price Change
  const handleInlinePriceSave = async (id: string, originalPrice: number) => {
    const newPrice = inlinePrices[id] !== undefined ? inlinePrices[id] : originalPrice;
    if (newPrice === originalPrice) return;
    if (newPrice < 0 || isNaN(newPrice)) {
      showToast('error', 'Invalid Price', 'Price must be a positive number.');
      return;
    }

    try {
      await updateInventoryItem(id, { basePrice: newPrice });
      showToast('success', 'Price Updated', `Selling price updated to ₹${newPrice}.`);
    } catch (err: any) {
      showToast('error', 'Price Update Failed', err.message);
    }
  };

  // 4. Inline On-Hand Stock Change
  const handleInlineStockSave = async (id: string, originalStock: number) => {
    const newStock = inlineStocks[id] !== undefined ? inlineStocks[id] : originalStock;
    if (newStock === originalStock) return;
    if (newStock < 0 || isNaN(newStock)) {
      showToast('error', 'Invalid Stock', 'Stock must be 0 or higher.');
      return;
    }

    try {
      await updateInventoryItem(id, { stockQty: newStock });
      showToast('success', 'Stock Updated', `On-hand stock updated to ${newStock} units.`);
    } catch (err: any) {
      showToast('error', 'Stock Update Failed', err.message);
    }
  };

  // 5. Inline Category Change
  const handleInlineCategoryChange = async (id: string, newCat: string) => {
    if (!newCat.trim()) return;
    try {
      await updateInventoryItem(id, { category: newCat });
      showToast('success', 'Category Updated', `Product category changed to "${newCat}".`);
    } catch (err: any) {
      showToast('error', 'Category Update Failed', err.message);
    }
  };

  // 6. Inline Name Change
  const handleInlineNameSave = async (id: string, originalName: string) => {
    const newName = inlineNames[id] !== undefined ? inlineNames[id].trim() : originalName;
    setEditingNameId(null);
    if (!newName || newName === originalName) return;

    try {
      await updateInventoryItem(id, { name: newName });
      showToast('success', 'Name Updated', `Product renamed to "${newName}".`);
    } catch (err: any) {
      showToast('error', 'Rename Failed', err.message);
    }
  };

  // 7. Inline Badge Change
  const handleInlineBadgeChange = async (id: string, newBadge: string) => {
    try {
      await updateInventoryItem(id, {
        description: updateItemDescriptionTag(id, 'badge', newBadge)
      });
      showToast('success', 'Badge Updated', `Product badge updated to "${newBadge}".`);
    } catch (err: any) {
      showToast('error', 'Badge Update Failed', err.message);
    }
  };

  // 8. Inline Grade Level Change
  const handleInlineGradeChange = async (id: string, newGrade: string) => {
    try {
      await updateInventoryItem(id, {
        description: updateItemDescriptionTag(id, 'grade', newGrade)
      });
      showToast('success', 'Grade Level Updated', `Grade level updated to "${newGrade}".`);
    } catch (err: any) {
      showToast('error', 'Grade Update Failed', err.message);
    }
  };

  // Helper to extract or embed tag in description
  const updateItemDescriptionTag = (id: string, tagType: 'badge' | 'grade', value: string) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return '';
    let desc = item.description || '';
    // Store metadata tags cleanly
    const tagPrefix = tagType === 'badge' ? '[BADGE:' : '[GRADE:';
    const regex = new RegExp(`\\${tagPrefix}[^\\]]+\\]`, 'g');
    desc = desc.replace(regex, '').trim();
    if (value && value !== 'NONE') {
      desc = `${desc} ${tagPrefix}${value}]`.trim();
    }
    return desc;
  };

  const getItemBadge = (item: InventoryItem) => {
    if (item.sku?.startsWith('EXP-KIT')) return 'FLAGSHIP KIT';
    const match = (item.description || '').match(/\[BADGE:([^\]]+)\]/);
    if (match) return match[1];
    return 'ATL APPROVED';
  };

  const getItemGrade = (item: InventoryItem) => {
    const match = (item.description || '').match(/\[GRADE:([^\]]+)\]/);
    if (match) return match[1];
    if (item.category?.toLowerCase() === 'anubhav') return 'Grades 1–5 (Early STEM)';
    if (item.category?.toLowerCase().includes('robotics')) return 'ATL Makerspace (Ages 10+)';
    return 'Grades 6–10 (Middle School)';
  };

  // Helper to process uploaded image file (converts to base64, validates size and type)
  const handleProcessImageFile = (
    file: File,
    onSuccess: (dataUrl: string, name: string, size: string) => void,
    onError: (msg: string) => void
  ) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError('Please select a valid image file (.png, .jpg, .jpeg, .webp, .svg, .gif).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onError('Image file size exceeds 10MB limit.');
      return;
    }

    const sizeKb = Math.round(file.size / 1024);
    const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        onSuccess(dataUrl, file.name, sizeStr);
      }
    };
    reader.onerror = () => {
      onError('Failed to read selected image file.');
    };
    reader.readAsDataURL(file);
  };

  // 9. Quick Image Update
  const handleQuickImageSave = async () => {
    if (!imageModalItem) return;
    try {
      await updateInventoryItem(imageModalItem.id, {
        imageUrl: customImageUrlInput.trim()
      });
      showToast('success', 'Image Updated', `Updated high-resolution image for "${imageModalItem.name}".`);
      setImageModalItem(null);
    } catch (err: any) {
      showToast('error', 'Image Update Failed', err.message);
    }
  };

  // 10. Open Full Edit Modal
  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      description: item.description || '',
      category: item.category || 'STEM Kits',
      basePrice: item.basePrice || 0,
      comparePrice: Math.round((item.basePrice || 0) * 1.25),
      imageUrl: item.imageUrl || '',
      isSellable: item.isSellable !== false,
      isHidden: item.isHidden || false,
      badge: getItemBadge(item),
      gradeLevel: getItemGrade(item),
      stockQty: item.stockQty || 0,
      unit: item.unit || 'pcs',
      threshold: item.threshold || 5,
      sku: item.barcode || item.sku || ''
    });
  };

  // 11. Save Full Product Edit Modal
  const handleSaveFullProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      // Embed badge and grade into description cleanly
      let cleanDesc = editForm.description.replace(/\[BADGE:[^\]]+\]/g, '').replace(/\[GRADE:[^\]]+\]/g, '').trim();
      if (editForm.badge && editForm.badge !== 'NONE') cleanDesc += ` [BADGE:${editForm.badge}]`;
      if (editForm.gradeLevel) cleanDesc += ` [GRADE:${editForm.gradeLevel}]`;

      await updateInventoryItem(editingItem.id, {
        name: editForm.name.trim(),
        description: cleanDesc.trim(),
        category: editForm.category.trim(),
        basePrice: editForm.basePrice,
        imageUrl: editForm.imageUrl.trim(),
        isSellable: editForm.isSellable,
        isHidden: editForm.isHidden,
        stockQty: editForm.stockQty,
        unit: editForm.unit,
        threshold: editForm.threshold,
        barcode: editForm.sku.trim(),
        sku: editForm.sku.trim()
      });

      showToast('success', 'Product Updated', `Saved all merchandising details for "${editForm.name}".`);
      setEditingItem(null);
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message);
    }
  };

  // 12. Batch Category Publish / Hide
  const handleBatchPublishCategory = async (categoryName: string, publish: boolean) => {
    const itemsInCat = inventory.filter(i => (i.category || '').toLowerCase() === categoryName.toLowerCase());
    try {
      for (const it of itemsInCat) {
        await updateInventoryItem(it.id, {
          isSellable: publish,
          isHidden: !publish
        });
      }
      showToast('success', 'Batch Update Complete', `${itemsInCat.length} products in "${categoryName}" set to ${publish ? 'Published' : 'Hidden'}.`);
    } catch (err: any) {
      showToast('error', 'Batch Update Failed', err.message);
    }
  };

  // 13. Publish All Flagship STEM Kits
  const handlePublishAllFlagshipKits = async () => {
    const flagshipKits = inventory.filter(i => (i.sku && i.sku.startsWith('EXP-KIT')) || i.category === 'STEM Kits');
    try {
      for (const kit of flagshipKits) {
        await updateInventoryItem(kit.id, {
          isSellable: true,
          isHidden: false
        });
      }
      showToast('success', 'Flagship STEM Kits Published', `${flagshipKits.length} Flagship Kits are now live on shop.experimindlabs.com.`);
    } catch (err: any) {
      showToast('error', 'Publish Failed', err.message);
    }
  };

  // 14. Order Fulfillment Handlers
  const handleOpenOrderDetails = (order: any) => {
    setSelectedOrderDetails(order);
    setOrderCarrierInput(order.carrier || 'Delhivery Express');
    setOrderTrackingInput(order.tracking_number || '');
    setOrderNotesInput(order.notes || '');
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateCustomerOrderStatus(orderId, status);
      showToast('success', 'Order Status Updated', `Order fulfillment set to ${status.toUpperCase()}.`);
      if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
        setSelectedOrderDetails((prev: any) => ({ ...prev, status }));
      }
    } catch (err: any) {
      showToast('error', 'Status Update Failed', err.message);
    }
  };

  const handleAdvanceOrderStatus = async (order: any, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const currentStatus = order.status || 'created';
    let nextStatus = 'paid';
    if (currentStatus === 'created') nextStatus = 'paid';
    else if (currentStatus === 'paid') nextStatus = 'packed';
    else if (currentStatus === 'packed') nextStatus = 'shipped';
    else if (currentStatus === 'shipped') nextStatus = 'delivered';
    else return;

    try {
      await updateCustomerOrderStatus(order.id, nextStatus);
      showToast('success', 'Order Advanced', `Order #${order.order_number || order.id.slice(0, 8)} moved to ${nextStatus.toUpperCase()}.`);
    } catch (err: any) {
      showToast('error', 'Advance Failed', err.message);
    }
  };

  const handleSaveFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderDetails) return;
    setOrderFulfillmentSaving(true);
    try {
      await updateCustomerOrderFulfillment(selectedOrderDetails.id, {
        status: selectedOrderDetails.status,
        carrier: orderCarrierInput,
        tracking_number: orderTrackingInput,
        notes: orderNotesInput,
        customer_address: selectedOrderDetails.customer_address,
        invoice_number: selectedOrderDetails.invoice_number
      });
      showToast('success', 'Fulfillment Updated', 'Carrier, AWB tracking, and internal dispatch notes saved.');
      setSelectedOrderDetails(null);
    } catch (err: any) {
      showToast('error', 'Fulfillment Save Failed', err.message);
    } finally {
      setOrderFulfillmentSaving(false);
    }
  };

  // 15. Save Live Storefront CMS
  const handleSaveCms = async () => {
    setCmsSaving(true);
    try {
      const res = await fetch('/api/public/storefront/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cmsConfig)
      });
      if (!res.ok) throw new Error('Failed to save CMS config');

      showToast('success', 'Storefront CMS Saved', 'Homepage banners, curriculum, and reviews are now live on shop.experimindlabs.com!');
    } catch (err: any) {
      showToast('error', 'Save CMS Failed', err.message);
    } finally {
      setCmsSaving(false);
    }
  };



  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header & Channel Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Public Channel
              </span>
              <span className="text-xs text-slate-400 font-mono">shop.experimindlabs.com</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-7 h-7 text-indigo-400" /> Storefront Channel Hub
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Complete merchant control center for real-time inline product editing, pricing, stock levels, images, badges, and homepage CMS.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => refreshCustomerOrders()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Sync Orders
            </button>
            <a
              href="https://shop.experimindlabs.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 hover:scale-102"
            >
              <span>Open Live Store</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Published Catalog</span>
            <Eye className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 dark:text-white">{publishedProducts.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">Active products visible to customers</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Storefront GMV</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
              ₹{storefrontGmv.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Gross direct customer volume</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Direct Orders</span>
            <ShoppingBag className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 dark:text-white">{customerOrders.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">Placed via web storefront</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Pending Fulfillment</span>
            <Truck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-500">{pendingFulfillments}</div>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting packing or courier pickup</p>
          </div>
        </div>
      </div>

      {/* Main Sub-Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('merchandising')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'merchandising'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Products & Merchandising ({inventory.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('orders')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'orders'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Direct Orders ({customerOrders.length})</span>
          {pendingFulfillments > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('cms')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'cms'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Visual Section CMS</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: PRODUCTS & MERCHANDISING MASTER (FULL EDITABLE) */}
      {/* ======================================================== */}
      {activeSubTab === 'merchandising' && (
        <div className="space-y-4">
          
          {/* Controls Bar: Search, Category Filter, Visibility Filter, Batch Actions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-grow max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search item name, SKU, barcode, or learning outcome..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category & Visibility Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none"
                >
                  <option value="ALL">All Categories ({inventory.length})</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value as any)}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none"
                >
                  <option value="ALL">All Products</option>
                  <option value="PUBLISHED">Published Only ({publishedProducts.length})</option>
                  <option value="HIDDEN">Hidden Only ({inventory.length - publishedProducts.length})</option>
                  <option value="FEATURED">Featured Stars ⭐ ({featuredIds.length})</option>
                </select>
              </div>
            </div>

            {/* Quick Batch Bar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">
                Showing <strong className="text-slate-900 dark:text-white">{filteredProducts.length}</strong> items • Click any field below to edit directly!
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePublishAllFlagshipKits}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                >
                  <Award className="w-3.5 h-3.5" /> Publish All Flagship STEM Kits
                </button>

                {selectedCategory !== 'ALL' && (
                  <>
                    <button
                      onClick={() => handleBatchPublishCategory(selectedCategory, true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                    >
                      <Eye className="w-3.5 h-3.5" /> Publish All in "{selectedCategory}"
                    </button>
                    <button
                      onClick={() => handleBatchPublishCategory(selectedCategory, false)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Hide All in "{selectedCategory}"
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Merchandising Data Table — FULLY EDITABLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 min-w-[240px]">Item & Image</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Category</th>
                    <th className="py-3.5 px-4 min-w-[130px]">Selling Price (₹)</th>
                    <th className="py-3.5 px-4 min-w-[130px]">On-Hand Stock</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Badges & Grade</th>
                    <th className="py-3.5 px-4 text-center min-w-[90px]">Featured</th>
                    <th className="py-3.5 px-4 text-center min-w-[130px]">Storefront Visibility</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No products match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((item) => {
                      const isPublished = (item.isSellable !== false) && !item.isHidden;
                      const isFeatured = featuredIds.includes(item.id) || featuredIds.includes(item.barcode || '');
                      const badgeValue = getItemBadge(item);
                      const gradeValue = getItemGrade(item);

                      const currentPrice = inlinePrices[item.id] !== undefined ? inlinePrices[item.id] : (item.basePrice || 0);
                      const currentStock = inlineStocks[item.id] !== undefined ? inlineStocks[item.id] : (item.stockQty || 0);
                      const currentName = inlineNames[item.id] !== undefined ? inlineNames[item.id] : item.name;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* 1. Item Name & Clickable Image Thumbnail */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {/* Clickable Image to Edit Image */}
                              <button
                                onClick={() => {
                                  setImageModalItem(item);
                                  setCustomImageUrlInput(item.imageUrl || '');
                                  setImageFileName('');
                                  setImageFileSize('');
                                  setImageFileError(null);
                                  setImageModalTab(item.imageUrl ? 'url' : 'upload');
                                }}
                                title="Click to Change Image"
                                className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 relative group hover:border-indigo-500 transition-all cursor-pointer shadow-2xs"
                              >
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform"
                                    onError={(e: any) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Upload className="w-4 h-4 text-white" />
                                </div>
                              </button>

                              {/* Editable Item Name & SKU */}
                              <div className="space-y-0.5 flex-grow min-w-0">
                                {editingNameId === item.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      autoFocus
                                      value={currentName}
                                      onChange={(e) => setInlineNames({ ...inlineNames, [item.id]: e.target.value })}
                                      onBlur={() => handleInlineNameSave(item.id, item.name)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleInlineNameSave(item.id, item.name);
                                        if (e.key === 'Escape') setEditingNameId(null);
                                      }}
                                      className="w-full px-2 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-indigo-500 text-slate-900 dark:text-white focus:outline-none"
                                    />
                                    <button
                                      onClick={() => handleInlineNameSave(item.id, item.name)}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => {
                                      setEditingNameId(item.id);
                                      setInlineNames({ ...inlineNames, [item.id]: item.name });
                                    }}
                                    title="Click to rename item"
                                    className="font-bold text-slate-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center gap-1 group"
                                  >
                                    <span className="truncate">{item.name}</span>
                                    <Edit className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400 shrink-0" />
                                  </div>
                                )}
                                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                                  <span>SKU: {item.barcode || item.sku || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Editable Category Dropdown */}
                          <td className="py-3.5 px-4">
                            <select
                              value={item.category || 'STEM Kits'}
                              onChange={(e) => handleInlineCategoryChange(item.id, e.target.value)}
                              className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer w-full"
                            >
                              <option value="STEM Kits">STEM Kits</option>
                              <option value="Maths kits">Maths kits (3D Geometry)</option>
                              <option value="Prastuti Science">Prastuti Science</option>
                              <option value="Robotics & IoT">Robotics & IoT</option>
                              <option value="Anubhav">Anubhav (Grades 1-5)</option>
                              <option value="Chemicals">Chemicals</option>
                              <option value="Physics & Mechanics">Physics & Mechanics</option>
                              <option value="Lab Glassware">Lab Glassware</option>
                              <option value="Fablab">Fablab</option>
                              <option value="Electronics">Electronics</option>
                              {categories.filter(c => ![
                                'STEM Kits', 'Maths kits', 'Prastuti Science', 'Robotics & IoT', 'Anubhav',
                                'Chemicals', 'Physics & Mechanics', 'Lab Glassware', 'Fablab', 'Electronics'
                              ].includes(c)).map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>

                          {/* 3. Editable Selling Price (₹) */}
                          <td className="py-3.5 px-4">
                            <div className="relative flex items-center">
                              <span className="absolute left-2.5 text-xs font-bold text-slate-400 pointer-events-none">₹</span>
                              <input
                                type="number"
                                min={0}
                                value={currentPrice}
                                onChange={(e) => setInlinePrices({ ...inlinePrices, [item.id]: parseFloat(e.target.value) || 0 })}
                                onBlur={() => handleInlinePriceSave(item.id, item.basePrice || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlinePriceSave(item.id, item.basePrice || 0);
                                }}
                                className="w-24 pl-6 pr-2 py-1.5 text-xs font-black rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-left"
                              />
                            </div>
                          </td>

                          {/* 4. Editable On-Hand Stock */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                value={currentStock}
                                onChange={(e) => setInlineStocks({ ...inlineStocks, [item.id]: parseInt(e.target.value, 10) || 0 })}
                                onBlur={() => handleInlineStockSave(item.id, item.stockQty || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineStockSave(item.id, item.stockQty || 0);
                                }}
                                className={`w-16 px-2 py-1.5 text-xs font-black rounded-xl border focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all ${
                                  currentStock <= 0
                                    ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                    : currentStock <= 5
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                }`}
                              />
                              <span className="text-[10px] text-slate-400 font-bold">{item.unit || 'pcs'}</span>
                            </div>
                          </td>

                          {/* 5. Editable Badges & Grade Dropdowns */}
                          <td className="py-3.5 px-4 space-y-1">
                            {/* Badge Dropdown */}
                            <select
                              value={badgeValue}
                              onChange={(e) => handleInlineBadgeChange(item.id, e.target.value)}
                              className="px-2 py-1 text-[10px] font-extrabold rounded-lg bg-indigo-500/10 dark:bg-indigo-950/60 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer w-full uppercase"
                            >
                              {PRESET_BADGES.map(b => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>

                            {/* Grade Level Dropdown */}
                            <select
                              value={gradeValue}
                              onChange={(e) => handleInlineGradeChange(item.id, e.target.value)}
                              className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 focus:outline-none cursor-pointer w-full"
                            >
                              {PRESET_GRADES.map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </td>

                          {/* 6. Featured Star Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleFeatured(item.id)}
                              title={isFeatured ? 'Featured on Storefront Hero (Click to unpin)' : 'Click to feature in Spotlight'}
                              className={`p-2 rounded-xl transition-all active:scale-90 cursor-pointer ${
                                isFeatured
                                  ? 'text-amber-400 bg-amber-400/15 border border-amber-400/30 shadow-xs'
                                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Star className={`w-4 h-4 ${isFeatured ? 'fill-amber-400' : ''}`} />
                            </button>
                          </td>

                          {/* 7. Storefront Visibility (1-Click Toggle) */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleSellable(item)}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black transition-all cursor-pointer active:scale-95 shadow-2xs ${
                                isPublished
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${isPublished ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                              <span>{isPublished ? 'PUBLISHED' : 'HIDDEN'}</span>
                            </button>
                          </td>

                          {/* 8. Full Edit Modal Action Button */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer shadow-2xs"
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: DIRECT STOREFRONT ORDERS & FULFILLMENT        */}
      {/* ======================================================== */}
      {activeSubTab === 'orders' && (
        <div className="space-y-6">
          
          {/* 1. Executive Fulfillment KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gross Sales GMV</span>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                ₹{storefrontGmv.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400">Total Storefront Inflow</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Orders</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {customerOrders.length}
              </div>
              <span className="text-[10px] text-slate-400">All-Time Volume</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 shadow-xs space-y-1 bg-amber-50/20">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">Ready to Pack</span>
              <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                {customerOrders.filter((o: any) => ['created', 'paid'].includes(o.status)).length}
              </div>
              <span className="text-[10px] text-amber-600 font-medium">Awaiting Warehouse Packing</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-4 shadow-xs space-y-1 bg-blue-50/20">
              <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold uppercase tracking-wider">In-Transit</span>
              <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                {customerOrders.filter((o: any) => o.status === 'shipped').length}
              </div>
              <span className="text-[10px] text-blue-600 font-medium">With Logistics Partners</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-4 shadow-xs space-y-1 bg-emerald-50/20 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">Delivered</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {customerOrders.filter((o: any) => o.status === 'delivered').length}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Completed Deliveries</span>
            </div>
          </div>

          {/* 2. Order Search & Filter Hub */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-grow max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Order #, Customer Name, Email, Phone, or AWB..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={refreshCustomerOrders}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Orders</span>
                </button>
              </div>
            </div>

            {/* Status Pills Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none text-xs">
              {[
                { id: 'ALL', label: 'All Orders', count: customerOrders.length },
                { id: 'created', label: 'Needs Action (Unfulfilled)', count: customerOrders.filter((o: any) => ['created', 'paid'].includes(o.status)).length },
                { id: 'packed', label: 'Packed in Lab', count: customerOrders.filter((o: any) => o.status === 'packed').length },
                { id: 'shipped', label: 'Dispatched / In-Transit', count: customerOrders.filter((o: any) => o.status === 'shipped').length },
                { id: 'delivered', label: 'Delivered', count: customerOrders.filter((o: any) => o.status === 'delivered').length },
                { id: 'cancelled', label: 'Cancelled', count: customerOrders.filter((o: any) => o.status === 'cancelled').length }
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setOrderStatusFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                    orderStatusFilter === pill.id
                      ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {pill.label} ({pill.count})
                </button>
              ))}
            </div>
          </div>

          {/* 3. Industry-Standard Orders Fulfillment Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Order ID & Date</th>
                    <th className="py-3.5 px-4">Customer & Destination</th>
                    <th className="py-3.5 px-4">Ordered STEM Apparatus</th>
                    <th className="py-3.5 px-4">Payment & Total</th>
                    <th className="py-3.5 px-4">Fulfillment & Carrier</th>
                    <th className="py-3.5 px-4 text-right">Actions & Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-500">
                        <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">No Orders Found</h3>
                        <p className="text-xs text-slate-400 mt-1">Orders placed on shop.experimindlabs.com appear here automatically.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order: any) => {
                      const status = order.status || 'created';
                      const isUnfulfilled = ['created', 'paid'].includes(status);
                      const isPacked = status === 'packed';
                      const isShipped = status === 'shipped';
                      const isDelivered = status === 'delivered';

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                          
                          {/* 1. Order ID & Date */}
                          <td className="py-3.5 px-4">
                            <div
                              onClick={() => handleOpenOrderDetails(order)}
                              className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span>#{order.order_number || order.id?.slice(0, 8)}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Just now'}
                            </div>
                            {order.invoice_number && (
                              <span className="inline-block mt-1 text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                                {order.invoice_number}
                              </span>
                            )}
                          </td>

                          {/* 2. Customer & Address */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{order.customer_name || 'Storefront Customer'}</span>
                              {order.gstin && (
                                <span className="text-[9px] font-mono bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                  GST
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {order.customer_phone || order.customer_email || 'Web Direct'}
                            </div>
                            {order.customer_address && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">
                                📍 {order.customer_address}
                              </div>
                            )}
                          </td>

                          {/* 3. Items Summary */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="space-y-1">
                              {(order.lines || []).slice(0, 2).map((line: any) => (
                                <div key={line.id} className="flex items-center gap-2 truncate text-[11px]">
                                  <span className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.2 rounded text-[10px]">
                                    {line.quantity}×
                                  </span>
                                  <span className="truncate text-slate-800 dark:text-slate-200">
                                    {line.item?.name || line.item_name || 'STEM Apparatus'}
                                  </span>
                                </div>
                              ))}
                              {(order.lines || []).length > 2 && (
                                <span className="text-[10px] text-slate-400 font-bold block">
                                  +{(order.lines || []).length - 2} more lab items
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. Total & Payment */}
                          <td className="py-3.5 px-4">
                            <div className="font-black text-slate-900 dark:text-white text-sm">
                              ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
                            </div>
                            <span className={`inline-block mt-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              order.payment_method === 'online' || order.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {order.payment_method || 'Cash on Delivery'}
                            </span>
                          </td>

                          {/* 5. Fulfillment & Logistics */}
                          <td className="py-3.5 px-4 space-y-1">
                            <div>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isDelivered
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : isShipped
                                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                  : isPacked
                                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              }`}>
                                {status === 'created' ? 'AWAITING PACK' : status.toUpperCase()}
                              </span>
                            </div>

                            {order.tracking_number && (
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <Truck className="w-3 h-3 text-indigo-500 shrink-0" />
                                <a
                                  href={`https://www.delhivery.com/track/package/${order.tracking_number}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold truncate max-w-[120px]"
                                  title="View carrier tracking"
                                >
                                  {order.tracking_number}
                                </a>
                              </div>
                            )}
                          </td>

                          {/* 6. Action Hub */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              
                              {/* 1-Click Status Advancer */}
                              {isUnfulfilled && (
                                <button
                                  onClick={(e) => handleAdvanceOrderStatus(order, e)}
                                  title="Mark as Packed in Lab"
                                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <PackageCheck className="w-3 h-3" /> Pack
                                </button>
                              )}

                              {isPacked && (
                                <button
                                  onClick={(e) => handleAdvanceOrderStatus(order, e)}
                                  title="Mark as Dispatched / Shipped"
                                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Truck className="w-3 h-3" /> Ship
                                </button>
                              )}

                              {isShipped && (
                                <button
                                  onClick={(e) => handleAdvanceOrderStatus(order, e)}
                                  title="Mark as Delivered"
                                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" /> Deliver
                                </button>
                              )}

                              {/* Print Shipping Label / Packing Slip */}
                              <button
                                onClick={() => setSelectedOrderForPackingSlip(order)}
                                title="Print Packing Slip & Shipping Label"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Print Tax Invoice */}
                              <button
                                onClick={() => setSelectedOrderForInvoice(order)}
                                title="Generate Official GST Tax Invoice"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <FileText className="w-4 h-4" />
                              </button>

                              {/* Full Workbench Modal */}
                              <button
                                onClick={() => handleOpenOrderDetails(order)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-all cursor-pointer"
                              >
                                Edit
                              </button>

                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: VISUAL CMS & STOREFRONT CUSTOMIZER            */}
      {/* ======================================================== */}
      {activeSubTab === 'cms' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CMS Section Navigation */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
              Storefront Sections
            </div>

            <button
              onClick={() => setActiveCmsSection('announcement')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeCmsSection === 'announcement'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Top Announcement Bar
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <button
              onClick={() => setActiveCmsSection('hero')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeCmsSection === 'hero'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> Hero Showcase & CTAs
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <button
              onClick={() => setActiveCmsSection('usps')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeCmsSection === 'usps'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" /> 4 Value Proposition Cards
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <button
              onClick={() => setActiveCmsSection('curriculum')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeCmsSection === 'curriculum'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Curriculum Graded Stages
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <button
              onClick={() => setActiveCmsSection('testimonials')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeCmsSection === 'testimonials'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Verified School Reviews
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <button
              onClick={() => setActiveCmsSection('faqs')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeCmsSection === 'faqs'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> FAQ Accordion
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <button
              onClick={() => setActiveCmsSection('theme')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeCmsSection === 'theme'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" /> Theme & Lab Contacts
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleSaveCms}
                disabled={cmsSaving}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{cmsSaving ? 'Saving to Database...' : 'Save & Publish Live'}</span>
              </button>
            </div>
          </div>

          {/* CMS Section Editor Panel */}
          <div className="lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            
            {/* 1. Announcement Bar Editor */}
            {activeCmsSection === 'announcement' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" /> Announcement Banner
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="font-bold text-xs">Show Announcement Bar</div>
                      <div className="text-[10px] text-slate-400">Display top notice across all pages</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={cmsConfig.announcement.isVisible}
                      onChange={(e) => setCmsConfig({
                        ...cmsConfig,
                        announcement: { ...cmsConfig.announcement, isVisible: e.target.checked }
                      })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Announcement Text
                    </label>
                    <input
                      type="text"
                      value={cmsConfig.announcement.text}
                      onChange={(e) => setCmsConfig({
                        ...cmsConfig,
                        announcement: { ...cmsConfig.announcement, text: e.target.value }
                      })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Promo Discount Code
                      </label>
                      <input
                        type="text"
                        value={cmsConfig.announcement.discountCode || ''}
                        onChange={(e) => setCmsConfig({
                          ...cmsConfig,
                          announcement: { ...cmsConfig.announcement, discountCode: e.target.value }
                        })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Banner Destination URL
                      </label>
                      <input
                        type="text"
                        value={cmsConfig.announcement.linkUrl || '/catalog'}
                        onChange={(e) => setCmsConfig({
                          ...cmsConfig,
                          announcement: { ...cmsConfig.announcement, linkUrl: e.target.value }
                        })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Hero Section Editor */}
            {activeCmsSection === 'hero' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-500" /> Hero Section & CTAs
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Eyebrow Badge Text
                    </label>
                    <input
                      type="text"
                      value={cmsConfig.hero.eyebrowBadge}
                      onChange={(e) => setCmsConfig({
                        ...cmsConfig,
                        hero: { ...cmsConfig.hero, eyebrowBadge: e.target.value }
                      })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Hero Subtitle / Value Explanation
                    </label>
                    <textarea
                      rows={3}
                      value={cmsConfig.hero.subtitle}
                      onChange={(e) => setCmsConfig({
                        ...cmsConfig,
                        hero: { ...cmsConfig.hero, subtitle: e.target.value }
                      })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Primary CTA Text
                      </label>
                      <input
                        type="text"
                        value={cmsConfig.hero.primaryCtaText}
                        onChange={(e) => setCmsConfig({
                          ...cmsConfig,
                          hero: { ...cmsConfig.hero, primaryCtaText: e.target.value }
                        })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Secondary CTA Text
                      </label>
                      <input
                        type="text"
                        value={cmsConfig.hero.secondaryCtaText}
                        onChange={(e) => setCmsConfig({
                          ...cmsConfig,
                          hero: { ...cmsConfig.hero, secondaryCtaText: e.target.value }
                        })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Hero Showcase Image URL
                    </label>
                    <input
                      type="url"
                      value={cmsConfig.hero.showcaseImageUrl}
                      onChange={(e) => setCmsConfig({
                        ...cmsConfig,
                        hero: { ...cmsConfig.hero, showcaseImageUrl: e.target.value }
                      })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. Value Propositions (USPs) */}
            {activeCmsSection === 'usps' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" /> 4 Value Proposition Cards
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cmsConfig.usps.map((usp: any, idx: number) => (
                    <div key={usp.id || idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="font-bold text-xs text-indigo-600">Card #{idx + 1}</div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Title</label>
                        <input
                          type="text"
                          value={usp.title}
                          onChange={(e) => {
                            const next = [...cmsConfig.usps];
                            next[idx] = { ...next[idx], title: e.target.value };
                            setCmsConfig({ ...cmsConfig, usps: next });
                          }}
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={usp.description}
                          onChange={(e) => {
                            const next = [...cmsConfig.usps];
                            next[idx] = { ...next[idx], description: e.target.value };
                            setCmsConfig({ ...cmsConfig, usps: next });
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Curriculum Graded Stages */}
            {activeCmsSection === 'curriculum' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" /> Curriculum Graded Pathways
                </h3>
                <div className="space-y-3">
                  {cmsConfig.curriculum.map((curr: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Grade Level</label>
                          <input
                            type="text"
                            value={curr.grade}
                            onChange={(e) => {
                              const next = [...cmsConfig.curriculum];
                              next[idx] = { ...next[idx], grade: e.target.value };
                              setCmsConfig({ ...cmsConfig, curriculum: next });
                            }}
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Pathway Title</label>
                          <input
                            type="text"
                            value={curr.title}
                            onChange={(e) => {
                              const next = [...cmsConfig.curriculum];
                              next[idx] = { ...next[idx], title: e.target.value };
                              setCmsConfig({ ...cmsConfig, curriculum: next });
                            }}
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Focus & Learning Outcomes</label>
                        <input
                          type="text"
                          value={curr.focus}
                          onChange={(e) => {
                            const next = [...cmsConfig.curriculum];
                            next[idx] = { ...next[idx], focus: e.target.value };
                            setCmsConfig({ ...cmsConfig, curriculum: next });
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Testimonials */}
            {activeCmsSection === 'testimonials' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-500" /> Verified Educator Testimonials
                </h3>
                <div className="space-y-4">
                  {cmsConfig.testimonials.map((t: any, idx: number) => (
                    <div key={t.id || idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Reviewer Name</label>
                          <input
                            type="text"
                            value={t.name}
                            onChange={(e) => {
                              const next = [...cmsConfig.testimonials];
                              next[idx] = { ...next[idx], name: e.target.value };
                              setCmsConfig({ ...cmsConfig, testimonials: next });
                            }}
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Role & School</label>
                          <input
                            type="text"
                            value={`${t.role} • ${t.institution}`}
                            onChange={(e) => {
                              const next = [...cmsConfig.testimonials];
                              next[idx] = { ...next[idx], institution: e.target.value };
                              setCmsConfig({ ...cmsConfig, testimonials: next });
                            }}
                            className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Quote</label>
                        <textarea
                          rows={2}
                          value={t.quote}
                          onChange={(e) => {
                            const next = [...cmsConfig.testimonials];
                            next[idx] = { ...next[idx], quote: e.target.value };
                            setCmsConfig({ ...cmsConfig, testimonials: next });
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. FAQ Accordion */}
            {activeCmsSection === 'faqs' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-500" /> FAQ Accordion
                </h3>
                <div className="space-y-3">
                  {cmsConfig.faqs.map((faq: any, idx: number) => (
                    <div key={faq.id || idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Question</label>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => {
                            const next = [...cmsConfig.faqs];
                            next[idx] = { ...next[idx], question: e.target.value };
                            setCmsConfig({ ...cmsConfig, faqs: next });
                          }}
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Answer</label>
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={(e) => {
                            const next = [...cmsConfig.faqs];
                            next[idx] = { ...next[idx], answer: e.target.value };
                            setCmsConfig({ ...cmsConfig, faqs: next });
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Theme & Contact Info */}
            {activeCmsSection === 'theme' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo-500" /> Theme & Lab Contacts
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Dispatches Email
                      </label>
                      <input
                        type="email"
                        value={cmsConfig.theme.schoolDispatchesEmail}
                        onChange={(e) => setCmsConfig({
                          ...cmsConfig,
                          theme: { ...cmsConfig.theme, schoolDispatchesEmail: e.target.value }
                        })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Support Phone
                      </label>
                      <input
                        type="text"
                        value={cmsConfig.theme.officialPhone}
                        onChange={(e) => setCmsConfig({
                          ...cmsConfig,
                          theme: { ...cmsConfig.theme, officialPhone: e.target.value }
                        })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Official Lab Office Address
                    </label>
                    <input
                      type="text"
                      value={cmsConfig.theme.officeAddress}
                      onChange={(e) => setCmsConfig({
                        ...cmsConfig,
                        theme: { ...cmsConfig.theme, officeAddress: e.target.value }
                      })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* QUICK IMAGE CHANGER & UPLOADER MODAL                     */}
      {/* ======================================================== */}
      {imageModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white truncate max-w-xs">
                    {imageModalItem.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    SKU: {imageModalItem.sku || imageModalItem.barcode || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setImageModalItem(null);
                  setImageFileError(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Preview Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-500 uppercase tracking-wider">Live Preview</span>
                {customImageUrlInput.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomImageUrlInput('');
                      setImageFileName('');
                      setImageFileSize('');
                    }}
                    className="text-red-500 hover:text-red-600 font-bold flex items-center gap-1 cursor-pointer text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Image</span>
                  </button>
                )}
              </div>

              <div className="aspect-video w-full rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-3 relative group shadow-inner">
                {customImageUrlInput.trim() ? (
                  <img
                    src={customImageUrlInput}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    onError={(e: any) => {
                      // Gracefully hide broken image element without external request
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-center text-slate-400 space-y-1.5 p-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200/60 dark:bg-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300">No Image Selected</div>
                    <div className="text-[11px] text-slate-400">
                      Upload an image file from your device, paste a URL, or choose a preset below
                    </div>
                  </div>
                )}

                {imageFileName && (
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 backdrop-blur-xs text-white text-[10px] py-1.5 px-3 rounded-xl flex items-center justify-between font-mono border border-white/10">
                    <span className="truncate max-w-[200px]">{imageFileName}</span>
                    <span className="text-emerald-400 font-bold">{imageFileSize}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setImageModalTab('upload')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  imageModalTab === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FolderUp className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => setImageModalTab('url')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  imageModalTab === 'url'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Web URL</span>
              </button>
              <button
                type="button"
                onClick={() => setImageModalTab('presets')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  imageModalTab === 'presets'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>STEM Presets</span>
              </button>
            </div>

            {/* Tab 1: Direct File Upload */}
            {imageModalTab === 'upload' && (
              <div className="space-y-3">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      handleProcessImageFile(
                        file,
                        (url, name, size) => {
                          setCustomImageUrlInput(url);
                          setImageFileName(name);
                          setImageFileSize(size);
                          setImageFileError(null);
                        },
                        (err) => setImageFileError(err)
                      );
                    }
                  }}
                  onClick={() => imageFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                    isDraggingFile
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/20'
                  }`}
                >
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleProcessImageFile(
                          file,
                          (url, name, size) => {
                            setCustomImageUrlInput(url);
                            setImageFileName(name);
                            setImageFileSize(size);
                            setImageFileError(null);
                          },
                          (err) => setImageFileError(err)
                        );
                      }
                    }}
                  />
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2.5 shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to browse or drag & drop image here
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Supports PNG, JPG, WebP, SVG (Up to 10MB)
                  </div>
                </div>

                {imageFileError && (
                  <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{imageFileError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: URL Input */}
            {imageModalTab === 'url' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Image Web URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or direct image link"
                  value={customImageUrlInput}
                  onChange={(e) => {
                    setCustomImageUrlInput(e.target.value);
                    setImageFileName('');
                    setImageFileSize('');
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Tip: Direct HTTPS links or Unsplash URLs load instantly across all devices.
                </p>
              </div>
            )}

            {/* Tab 3: STEM Presets */}
            {imageModalTab === 'presets' && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Curated High-Res STEM Kit Photo:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {STEM_PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setCustomImageUrlInput(preset.url);
                        setImageFileName(preset.label);
                        setImageFileSize('High-Res Preset');
                      }}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-left border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 transition-all flex items-center gap-2.5 cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                        <img src={preset.url} alt={preset.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 truncate">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setImageModalItem(null);
                  setImageFileError(null);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickImageSave}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Image</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FULL PRODUCT EDIT MODAL                                  */}
      {/* ======================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Merchandising Details: {editingItem.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFullProduct} className="space-y-4">
              <div className="space-y-3">
                {/* Title & SKU */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Product Title
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      SKU / Barcode
                    </label>
                    <input
                      type="text"
                      value={editForm.sku}
                      onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description & Learning Outcomes
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Price, Stock, Category */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Selling Price (₹ INR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.basePrice}
                      onChange={(e) => setEditForm({ ...editForm, basePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      On-Hand Stock
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.stockQty}
                      onChange={(e) => setEditForm({ ...editForm, stockQty: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>

                {/* Badges & Grade Level */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Badge Label
                    </label>
                    <select
                      value={editForm.badge}
                      onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    >
                      {PRESET_BADGES.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Grade Level Target
                    </label>
                    <select
                      value={editForm.gradeLevel}
                      onChange={(e) => setEditForm({ ...editForm, gradeLevel: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    >
                      {PRESET_GRADES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Image Section with Direct Upload & URL */}
                <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Product Image
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditFormImageTab('upload')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          editFormImageTab === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFormImageTab('url')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          editFormImageTab === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Web URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFormImageTab('presets')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          editFormImageTab === 'presets' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Presets
                      </button>
                    </div>
                  </div>

                  {editFormImageTab === 'upload' && (
                    <div
                      onClick={() => editFormFileInputRef.current?.click()}
                      className="border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-3 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                    >
                      <input
                        ref={editFormFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleProcessImageFile(
                              file,
                              (url) => setEditForm({ ...editForm, imageUrl: url }),
                              (err) => showToast('error', 'Upload Error', err)
                            );
                          }
                        }}
                      />
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Upload className="w-4 h-4 text-indigo-500" />
                        <span>Click to choose image file from device</span>
                      </div>
                    </div>
                  )}

                  {editFormImageTab === 'url' && (
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={editForm.imageUrl}
                      onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  )}

                  {editFormImageTab === 'presets' && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {STEM_PRESET_IMAGES.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, imageUrl: p.url })}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate text-left hover:border-indigo-500"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {editForm.imageUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1">
                        <img src={editForm.imageUrl} alt="preview" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1">
                        <span className="text-[11px] font-bold text-emerald-600 block">✓ Image Attached</span>
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, imageUrl: '' })}
                          className="text-[10px] text-red-500 hover:underline font-bold"
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visibility Controls */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block text-xs">Publish to Storefront</span>
                    <span className="text-[11px] text-slate-500">Make this product purchasable on shop.experimindlabs.com</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editForm.isSellable && !editForm.isHidden}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      isSellable: e.target.checked,
                      isHidden: !e.target.checked
                    })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Save & Publish Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. ORDER FULFILLMENT WORKBENCH MODAL                    */}
      {/* ======================================================== */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-black text-lg sm:text-xl text-slate-900 dark:text-white">
                    Order #{selectedOrderDetails.order_number || selectedOrderDetails.id?.slice(0, 8)}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    selectedOrderDetails.status === 'delivered'
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : selectedOrderDetails.status === 'shipped'
                      ? 'bg-blue-500/15 text-blue-600'
                      : selectedOrderDetails.status === 'packed'
                      ? 'bg-indigo-500/15 text-indigo-600'
                      : 'bg-amber-500/15 text-amber-600'
                  }`}>
                    {selectedOrderDetails.status?.toUpperCase() || 'CREATED'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Placed on shop.experimindlabs.com • Total: <strong className="text-slate-700 dark:text-slate-200 font-mono">₹{Number(selectedOrderDetails.total_amount || 0).toLocaleString('en-IN')}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedOrderForPackingSlip(selectedOrderDetails)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                  title="Print Packing Slip"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedOrderForInvoice(selectedOrderDetails)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                  title="Print Tax Invoice"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedOrderDetails(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveFulfillment} className="space-y-5 text-xs">
              
              {/* Fulfillment Status Advancer Stepper */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Update Fulfillment Pipeline
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'created', label: '1. Created (Pending)', color: 'border-amber-400' },
                    { id: 'paid', label: '2. Payment Confirmed', color: 'border-amber-500' },
                    { id: 'packed', label: '3. Packed in Lab', color: 'border-indigo-500' },
                    { id: 'shipped', label: '4. Dispatched / In-Transit', color: 'border-blue-500' },
                    { id: 'delivered', label: '5. Handed Over / Delivered', color: 'border-emerald-500' },
                    { id: 'cancelled', label: 'Cancelled', color: 'border-red-500' }
                  ].map((st) => (
                    <button
                      type="button"
                      key={st.id}
                      onClick={() => handleUpdateOrderStatus(selectedOrderDetails.id, st.id)}
                      className={`px-3 py-2 rounded-xl font-bold uppercase transition-all cursor-pointer ${
                        selectedOrderDetails.status === st.id
                          ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logistics & Carrier Configuration */}
              <div className="bg-indigo-50/40 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Courier & AWB Tracking Details</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Logistics Partner / Courier
                    </label>
                    <select
                      value={orderCarrierInput}
                      onChange={(e) => setOrderCarrierInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                    >
                      <option value="Delhivery Express">Delhivery Express</option>
                      <option value="BlueDart Air">BlueDart Air</option>
                      <option value="DTDC Priority">DTDC Priority</option>
                      <option value="India Post Speed Post">India Post Speed Post</option>
                      <option value="XpressBees">XpressBees</option>
                      <option value="Shadowfax">Shadowfax</option>
                      <option value="Self-Pickup / Campus Handover">Self-Pickup / Campus Handover</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      AWB / Tracking Number
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. DEL-7892348129"
                        value={orderTrackingInput}
                        onChange={(e) => setOrderTrackingInput(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setOrderTrackingInput(`DEL-${Math.floor(1000000000 + Math.random() * 9000000000)}`)}
                        className="px-2.5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-[10px] shrink-0"
                      >
                        Auto
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer & Address Details */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Customer & Delivery Destination
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Contact Name</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{selectedOrderDetails.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Email</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">{selectedOrderDetails.customer_email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Phone Number</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">{selectedOrderDetails.customer_phone || 'N/A'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Complete Shipping Address
                  </label>
                  <textarea
                    rows={2}
                    value={selectedOrderDetails.customer_address || ''}
                    onChange={(e) => setSelectedOrderDetails({ ...selectedOrderDetails, customer_address: e.target.value })}
                    placeholder="Enter complete shipping address..."
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Internal Packaging & Fulfillment Notes
                  </label>
                  <input
                    type="text"
                    value={orderNotesInput}
                    onChange={(e) => setOrderNotesInput(e.target.value)}
                    placeholder="e.g. Extra bubble wrap on optical prisms, tested microcontroller firmware v2.1"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Order Items Table */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Ordered STEM Apparatus & Kits ({selectedOrderDetails.lines?.length || 0})
                </span>
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {(selectedOrderDetails.lines || []).map((line: any) => (
                    <div key={line.id} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{line.item?.name || line.item_name || 'Item'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {line.item?.sku || line.item_id}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-700 dark:text-slate-300">{line.quantity} × ₹{Number(line.unit_price).toLocaleString('en-IN')}</div>
                        <div className="font-black text-indigo-600 dark:text-indigo-400">₹{Number(line.quantity * line.unit_price).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save & Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForPackingSlip(selectedOrderDetails)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Packing Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForInvoice(selectedOrderDetails)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> Tax Invoice
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderDetails(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={orderFulfillmentSaving}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{orderFulfillmentSaving ? 'Saving...' : 'Save Fulfillment'}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. PRINTABLE PACKING SLIP & SHIPPING LABEL MODAL        */}
      {/* ======================================================== */}
      {selectedOrderForPackingSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 space-y-6 text-slate-900 border border-slate-200 max-h-[92vh] overflow-y-auto">
            
            {/* Header controls (hidden on print) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-sm">Industrial Thermal Shipping Label & Packing Slip</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Label (A4 / Thermal)
                </button>
                <button
                  onClick={() => setSelectedOrderForPackingSlip(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="border-2 border-dashed border-slate-800 p-6 space-y-6 rounded-2xl bg-white font-sans">
              
              {/* Top Banner with Carrier & Barcode */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="text-xl font-black tracking-tighter text-indigo-900">
                    EXPERIMIND LABS
                  </div>
                  <div className="text-[10px] font-mono text-slate-600">
                    CENTRAL STEM TECHNICAL WAREHOUSE • KARNATAKA, INDIA
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black uppercase text-indigo-700">
                    {selectedOrderForPackingSlip.carrier || 'DELHIVERY AIR EXPRESS'}
                  </div>
                  <div className="text-[10px] font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded mt-0.5">
                    AWB: {selectedOrderForPackingSlip.tracking_number || `EXP-${selectedOrderForPackingSlip.id?.slice(0, 8)}`}
                  </div>
                </div>
              </div>

              {/* Barcode Graphic Representation */}
              <div className="bg-slate-50 p-3 border border-slate-300 rounded-xl text-center space-y-1">
                <div className="font-mono text-2xl tracking-[0.3em] font-black text-slate-900">
                  ||| | |||| ||| || ||||| || |||
                </div>
                <div className="text-[10px] font-mono font-bold text-slate-600">
                  *{selectedOrderForPackingSlip.tracking_number || selectedOrderForPackingSlip.id}*
                </div>
              </div>

              {/* Sender & Receiver Address Grid */}
              <div className="grid grid-cols-2 gap-4 border-b-2 border-slate-900 pb-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">SHIP FROM (LAB):</span>
                  <div className="font-bold">ExperiMind Labs Private Limited</div>
                  <div className="text-[11px] text-slate-600 leading-tight">
                    Plot 18, Tech Research Park, Electronic City Phase 1, Bengaluru, Karnataka - 560100
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">GSTIN: 29AAACE1234F1Z5 • +91 80 4123 9876</div>
                </div>

                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">SHIP TO (CONSIGNEE):</span>
                  <div className="font-black text-sm">{selectedOrderForPackingSlip.customer_name}</div>
                  <div className="text-[11px] text-slate-700 leading-tight">
                    {selectedOrderForPackingSlip.customer_address || 'Delivery Address on File'}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-900 pt-1">
                    📞 {selectedOrderForPackingSlip.customer_phone || 'Verified'}
                  </div>
                </div>
              </div>

              {/* Order Package Checklist */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <span>PACKAGE CONTENTS & QA CHECKLIST</span>
                  <span>ORDER #{selectedOrderForPackingSlip.order_number || selectedOrderForPackingSlip.id?.slice(0, 8)}</span>
                </div>

                <div className="border border-slate-300 rounded-xl divide-y divide-slate-200">
                  {(selectedOrderForPackingSlip.lines || []).map((line: any) => (
                    <div key={line.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-slate-400 rounded flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                        <span className="font-bold">{line.item?.name || line.item_name}</span>
                      </div>
                      <div className="font-mono font-bold text-slate-700">
                        Qty: {line.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Package Handling Footer */}
              <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-200">
                <span>FRAGILE • PRECISION EDUCATIONAL SENSORS</span>
                <span>INSPECTED BY LAB QA #04</span>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. OFFICIAL GST TAX INVOICE MODAL                        */}
      {/* ======================================================== */}
      {selectedOrderForInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-8 space-y-6 text-slate-900 border border-slate-200 max-h-[92vh] overflow-y-auto">
            
            {/* Header controls */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-sm">Official Institutional GST Tax Invoice (Original for Recipient)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print / Download PDF
                </button>
                <button
                  onClick={() => setSelectedOrderForInvoice(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official GST Tax Invoice Template */}
            <div className="border border-slate-300 p-8 space-y-6 rounded-2xl bg-white font-sans text-xs">
              
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">TAX INVOICE</h1>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mt-0.5">
                    (Issued under Section 31 of CGST Act, 2017)
                  </span>
                  <div className="mt-3 space-y-0.5 text-xs text-slate-700">
                    <div className="font-black text-sm text-indigo-900">EXPERIMIND LABS PRIVATE LIMITED</div>
                    <div>Plot 18, Tech Research Park, Electronic City Phase 1</div>
                    <div>Bengaluru, Karnataka - 560100, India</div>
                    <div><strong>GSTIN:</strong> 29AAACE1234F1Z5 • <strong>State Code:</strong> 29</div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-left space-y-1">
                    <div><strong>Invoice No:</strong> <span className="font-mono font-bold text-indigo-700">{selectedOrderForInvoice.invoice_number || `INV-EXP-2026-${selectedOrderForInvoice.id?.slice(0, 5)}`}</span></div>
                    <div><strong>Invoice Date:</strong> {new Date(selectedOrderForInvoice.created_at || Date.now()).toLocaleDateString('en-IN')}</div>
                    <div><strong>Order ID:</strong> #{selectedOrderForInvoice.order_number || selectedOrderForInvoice.id?.slice(0, 8)}</div>
                    <div><strong>Place of Supply:</strong> Karnataka (29)</div>
                  </div>
                </div>
              </div>

              {/* Billed To & Shipped To */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">BILLED TO (BUYER):</span>
                  <div className="font-bold text-slate-900">{selectedOrderForInvoice.customer_name}</div>
                  <div className="text-slate-600">{selectedOrderForInvoice.customer_address || 'Central School Lab'}</div>
                  <div className="text-slate-600">Phone: {selectedOrderForInvoice.customer_phone || 'Verified'}</div>
                  {selectedOrderForInvoice.gstin && <div><strong>Buyer GSTIN:</strong> <span className="font-mono">{selectedOrderForInvoice.gstin}</span></div>}
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">PAYMENT & LOGISTICS:</span>
                  <div><strong>Payment Mode:</strong> <span className="uppercase">{selectedOrderForInvoice.payment_method || 'Online Prepaid'}</span></div>
                  <div><strong>Carrier:</strong> {selectedOrderForInvoice.carrier || 'Delhivery Express'}</div>
                  <div><strong>AWB No:</strong> <span className="font-mono">{selectedOrderForInvoice.tracking_number || 'DEL-8923481'}</span></div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-300 font-bold uppercase text-[10px] text-slate-600">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-3">Description of Goods / Apparatus</th>
                    <th className="py-2 px-2">HSN/SAC</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Unit Rate (₹)</th>
                    <th className="py-2 px-3 text-right">Taxable Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {(selectedOrderForInvoice.lines || []).map((l: any, idx: number) => {
                    const rate = Number(l.unit_price) / 1.18; // Reverse calculate base before 18% GST
                    const taxable = rate * Number(l.quantity);
                    return (
                      <tr key={l.id || idx}>
                        <td className="py-2.5 px-2">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold">{l.item?.name || l.item_name}</td>
                        <td className="py-2.5 px-2 font-mono text-[10px]">90230000</td>
                        <td className="py-2.5 px-2 text-center font-bold">{l.quantity}</td>
                        <td className="py-2.5 px-2 text-right font-mono">₹{rate.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">₹{taxable.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Tax Calculations & Total */}
              <div className="grid grid-cols-2 gap-4 border-t-2 border-slate-900 pt-4">
                <div className="text-[11px] space-y-1 text-slate-600">
                  <div><strong>Bank Name:</strong> HDFC Bank Ltd</div>
                  <div><strong>Account Name:</strong> ExperiMind Labs Pvt Ltd</div>
                  <div><strong>Account No:</strong> 50200084920194</div>
                  <div><strong>IFSC Code:</strong> HDFC0001234</div>
                </div>

                <div className="space-y-1 text-right text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Taxable Amount:</span>
                    <span className="font-mono">₹{(Number(selectedOrderForInvoice.total_amount) / 1.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CGST (9%):</span>
                    <span className="font-mono">₹{((Number(selectedOrderForInvoice.total_amount) / 1.18) * 0.09).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SGST (9%):</span>
                    <span className="font-mono">₹{((Number(selectedOrderForInvoice.total_amount) / 1.18) * 0.09).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-300 text-slate-900">
                    <span>Total Invoice Value:</span>
                    <span className="text-indigo-700">₹{Number(selectedOrderForInvoice.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Sign-off */}
              <div className="pt-8 flex justify-between items-end text-[10px] text-slate-500">
                <span>This is a computer generated institutional invoice.</span>
                <div className="text-right">
                  <div className="font-bold text-slate-900">For ExperiMind Labs Private Limited</div>
                  <div className="pt-6 font-mono">Authorized Signatory</div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
