// ميعاد — story data. One coherent scenario shared by the customer app and admin dashboard.
export const MeaadStory = {
  // The patient the whole story follows
  patient: { name: 'سارة عبدالله', first: 'سارة', phone: '0100 123 4567' },

  branches: [
    { name: 'فرع أكتوبر', addr: '٦ أكتوبر · المحور المركزي', hours: '10 ص – 10 م', dist: '2.4 كم' },
    { name: 'فرع المعادي', addr: 'المعادي · شارع ٩', hours: '11 ص – 9 م', dist: '6.1 كم' },
    { name: 'فرع مدينة نصر', addr: 'مدينة نصر · عباس العقاد', hours: '10 ص – 11 م', dist: '9.7 كم' },
  ],
  services: [
    { name: 'تنظيف أسنان', dur: '45 دقيقة', icon: 'sparkles', price: 600 },
    { name: 'استشارة', dur: '30 دقيقة', icon: 'clipboard-list', price: 450 },
    { name: 'متابعة', dur: '20 دقيقة', icon: 'repeat', price: 300 },
    { name: 'أشعة', dur: '15 دقيقة', icon: 'scan-line', price: 350 },
  ],
  doctors: [
    { name: 'الدكتور أحمد سمير', spec: 'أسنان', rating: '4.9', next: 'أقرب موعد اليوم' },
    { name: 'الدكتورة منى خالد', spec: 'جلدية', rating: '4.8', next: 'أقرب موعد غداً' },
    { name: 'الدكتور يوسف حسن', spec: 'باطنة', rating: '4.7', next: 'أقرب موعد الخميس' },
  ],
  dates: [
    { day: 'السبت', d: '9', mo: 'أغسطس' },
    { day: 'الأحد', d: '10', mo: 'أغسطس' },
    { day: 'الإثنين', d: '11', mo: 'أغسطس' },
    { day: 'الثلاثاء', d: '12', mo: 'أغسطس' },
    { day: 'الأربعاء', d: '13', mo: 'أغسطس' },
  ],
  // taken index = booked slot (struck through)
  times: ['4:00 م', '4:30 م', '5:00 م', '5:30 م', '6:00 م', '6:30 م', '7:00 م', '7:30 م'],
  takenTime: '5:30 م',
  // the choice the story lands on
  chosen: { branch: 'فرع أكتوبر', service: 'تنظيف أسنان', doctor: 'الدكتور أحمد سمير', date: '12 أغسطس', day: 'الثلاثاء', time: '5:00 مساءً', code: 'MA-4821' },

  // ===== Admin =====
  kpis: [
    { label: 'مواعيد اليوم', value: '24', icon: 'calendar-days', tone: 'brand', delta: '+3' },
    { label: 'مؤكدة', value: '18', icon: 'check-circle', tone: 'success' },
    { label: 'قيد الانتظار', value: '4', icon: 'clock', tone: 'warning' },
    { label: 'نسبة الإشغال', value: '78%', icon: 'activity', tone: 'info', delta: '+6%' },
  ],
  // Admin agenda for 12 أغسطس — includes سارة's new booking at 5:00
  agenda: [
    { id: 1, time: '4:00 م', customer: 'خالد منير', service: 'استشارة', doctor: 'الدكتور أحمد سمير', phone: '0106 220 4411', status: 'confirmed' },
    { id: 2, time: '4:30 م', customer: 'داليا رأفت', service: 'متابعة', doctor: 'الدكتور أحمد سمير', phone: '0111 880 2255', status: 'confirmed' },
    { id: 3, time: '5:00 م', customer: 'سارة عبدالله', service: 'تنظيف أسنان', doctor: 'الدكتور أحمد سمير', phone: '0100 123 4567', status: 'pending', isNew: true },
    { id: 4, time: '5:30 م', customer: 'محمد عادل', service: 'تنظيف أسنان', doctor: 'الدكتور أحمد سمير', phone: '0111 555 8899', status: 'confirmed' },
    { id: 5, time: '6:00 م', customer: 'ليلى فؤاد', service: 'استشارة', doctor: 'الدكتورة منى خالد', phone: '0122 777 3344', status: 'confirmed' },
    { id: 6, time: '6:30 م', customer: 'نورهان سعيد', service: 'أشعة', doctor: 'الدكتور أحمد سمير', phone: '0155 432 1098', status: 'cancelled' },
  ],
  reminders: [
    { id: 'r1', title: 'التذكير الأول', timing: 'قبل 24 ساعة من الموعد', on: true },
    { id: 'r2', title: 'التذكير الثاني', timing: 'قبل ساعة واحدة من الموعد', on: false },
  ],
  channels: [
    { id: 'wa', label: 'WhatsApp', icon: 'message-circle', on: true, color: 'var(--whatsapp)' },
    { id: 'sms', label: 'SMS', icon: 'message-square', on: true, color: 'var(--blue-500)' },
    { id: 'email', label: 'Email', icon: 'mail', on: false, color: 'var(--gray-500)' },
  ],
  // notification lifecycle board
  notifications: [
    { id: 'n1', customer: 'سارة عبدالله', channel: 'WhatsApp', kind: 'تأكيد الحجز', time: 'الآن', status: 'delivered' },
    { id: 'n2', customer: 'خالد منير', channel: 'WhatsApp', kind: 'تذكير 24 ساعة', time: '9:00 صباحًا', status: 'delivered' },
    { id: 'n3', customer: 'داليا رأفت', channel: 'SMS', kind: 'تذكير 24 ساعة', time: '9:00 صباحًا', status: 'sent' },
    { id: 'n4', customer: 'محمد عادل', channel: 'WhatsApp', kind: 'تذكير ساعة', time: '4:30 مساءً', status: 'scheduled' },
    { id: 'n5', customer: 'ليلى فؤاد', channel: 'SMS', kind: 'تذكير 24 ساعة', time: '9:00 صباحًا', status: 'failed' },
  ],
  roster: [
    { name: 'الدكتور أحمد سمير', spec: 'أسنان', branch: 'فرع أكتوبر', rating: '4.9', patients: 312, days: 'السبت – الأربعاء', hours: '4 – 10 م', active: true, today: 8 },
    { name: 'الدكتورة منى خالد', spec: 'جلدية', branch: 'فرع المعادي', rating: '4.8', patients: 208, days: 'الأحد – الخميس', hours: '11 ص – 5 م', active: true, today: 5 },
    { name: 'الدكتورة سلمى ناصر', spec: 'أطفال', branch: 'فرع أكتوبر', rating: '5.0', patients: 96, days: 'الإثنين – الجمعة', hours: '10 ص – 3 م', active: true, today: 3 },
    { name: 'الدكتور يوسف حسن', spec: 'باطنة', branch: 'فرع مدينة نصر', rating: '4.7', patients: 174, days: 'السبت – الثلاثاء', hours: '5 – 11 م', active: false, today: 0 },
  ],
  revenueByService: [
    { name: 'تنظيف أسنان', value: 38, amount: '18,400' },
    { name: 'استشارة', value: 30, amount: '14,600' },
    { name: 'أشعة', value: 18, amount: '8,750' },
    { name: 'متابعة', value: 14, amount: '6,900' },
  ],
  invoices: [
    { id: 'INV-2051', customer: 'سارة عبدالله', service: 'تنظيف أسنان', date: '12 أغسطس', method: 'بطاقة', amount: 600, status: 'paid' },
    { id: 'INV-2050', customer: 'خالد منير', service: 'استشارة', date: '12 أغسطس', method: 'نقدي', amount: 450, status: 'paid' },
    { id: 'INV-2049', customer: 'داليا رأفت', service: 'متابعة', date: '12 أغسطس', method: 'محفظة', amount: 300, status: 'pending' },
    { id: 'INV-2048', customer: 'ليلى فؤاد', service: 'استشارة', date: '11 أغسطس', method: 'بطاقة', amount: 500, status: 'paid' },
    { id: 'INV-2047', customer: 'كريم وليد', service: 'متابعة', date: '11 أغسطس', method: 'بطاقة', amount: 300, status: 'refunded' },
  ],
  accTotals: { today: '48,650', month: '312,400', paidCount: 41, pendingCount: 6 },

  // ===== Staff & permissions =====
  staff: [
    { id: 's1', name: 'نهى المصري', role: 'مدير العيادة', branch: 'فرع أكتوبر', email: 'noha@meaad.sa', phone: '0100 456 7890', status: 'active' },
    { id: 's2', name: 'مريم فتحي', role: 'موظف استقبال', branch: 'فرع أكتوبر', email: 'mariam@meaad.sa', phone: '0111 223 3445', status: 'active' },
    { id: 's3', name: 'عمر الشريف', role: 'محاسب', branch: 'فرع المعادي', email: 'omar@meaad.sa', phone: '0122 998 8776', status: 'active' },
    { id: 's4', name: 'هبة سامي', role: 'موظف استقبال', branch: 'فرع مدينة نصر', email: 'heba@meaad.sa', phone: '0155 334 2210', status: 'suspended' },
  ],
  roles: [
    { id: 'owner', name: 'مدير العيادة', color: 'var(--teal-700)', permissions: { view_bookings: 'full', manage_bookings: 'full', manage_availability: 'full', leads_access: 'full', manage_services_pricing: 'full', reports_analytics: 'full', manage_payments: 'full' } },
    { id: 'admin', name: 'أدمن', color: 'var(--blue-600)', permissions: { view_bookings: 'full', manage_bookings: 'full', manage_availability: 'full', leads_access: 'full', manage_services_pricing: 'full', reports_analytics: 'full', manage_payments: 'none' } },
    { id: 'reception', name: 'موظف استقبال', color: 'var(--blue-500)', permissions: { view_bookings: 'full', manage_bookings: 'full', manage_availability: 'none', leads_access: 'full', manage_services_pricing: 'none', reports_analytics: 'none', manage_payments: 'none' } },
    { id: 'viewer', name: 'مشاهد', color: 'var(--gray-500)', permissions: { view_bookings: 'full', manage_bookings: 'none', manage_availability: 'none', leads_access: 'none', manage_services_pricing: 'none', reports_analytics: 'none', manage_payments: 'none' } },
    { id: 'accountant', name: 'محاسب', color: 'var(--amber-600)', permissions: { view_bookings: 'full', manage_bookings: 'none', manage_availability: 'none', leads_access: 'none', manage_services_pricing: 'none', reports_analytics: 'full', manage_payments: 'full' } },
    { id: 'doctor', name: 'طبيب', color: 'var(--green-600)', permissions: { view_bookings: 'full', manage_bookings: 'none', manage_availability: 'none', leads_access: 'none', manage_services_pricing: 'none', reports_analytics: 'none', manage_payments: 'none' } },
  ],
  permissionModules: [
    ['view_bookings', 'عرض الحجوزات'],
    ['manage_bookings', 'إدارة الحجوزات (إلغاء/جدولة)'],
    ['manage_availability', 'إدارة المواعيد المتاحة'],
    ['leads_access', 'الوصول لعملاء المحتملين'],
    ['manage_services_pricing', 'إدارة الخدمات والأسعار'],
    ['reports_analytics', 'التقارير والتحليلات'],
    ['manage_payments', 'إدارة المدفوعات والاسترجاع'],
  ],
};
