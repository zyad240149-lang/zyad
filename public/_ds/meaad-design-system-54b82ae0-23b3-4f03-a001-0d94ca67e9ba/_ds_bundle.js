/* @ds-bundle: {"format":4,"namespace":"MeaadDesignSystem_54b82a","components":[{"name":"Avatar","sourcePath":"components/display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"Field","sourcePath":"components/display/Field.jsx"},{"name":"StatusPill","sourcePath":"components/display/StatusPill.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Icon","sourcePath":"components/icon/Icon.jsx"},{"name":"SidebarItem","sourcePath":"components/navigation/SidebarItem.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/display/Avatar.jsx":"692a773cc2f8","components/display/Badge.jsx":"9044853dd25a","components/display/Card.jsx":"f30bae81e38a","components/display/Field.jsx":"94a20cfba848","components/display/StatusPill.jsx":"0235849be649","components/feedback/Alert.jsx":"36df7dc056a9","components/feedback/Modal.jsx":"d60885d5f93d","components/forms/Button.jsx":"b53f4e272646","components/forms/Checkbox.jsx":"d719621bb4df","components/forms/IconButton.jsx":"2e3913ce679e","components/forms/Input.jsx":"b3d1244ca2e8","components/forms/Select.jsx":"63af25c93637","components/forms/Switch.jsx":"633f711630c0","components/forms/Textarea.jsx":"f192332ab60c","components/icon/Icon.jsx":"14c5b9bb96ed","components/navigation/SidebarItem.jsx":"101d49dd3be4","components/navigation/Tabs.jsx":"c4d39a2f9329","ui_kits/admin/AccountingScreen.jsx":"574f07215161","ui_kits/admin/AdminShell.jsx":"a6aa6870e098","ui_kits/admin/AppointmentModal.jsx":"9d53b6563766","ui_kits/admin/AppointmentsScreen.jsx":"afea8bc82db7","ui_kits/admin/DoctorsScreen.jsx":"84ad9dd9c75c","ui_kits/admin/ReminderSettings.jsx":"060635f0bc18","ui_kits/admin/data.js":"0244cde395e1","ui_kits/customer/BookingWizard.jsx":"bb3a7e8a5bab","ui_kits/customer/data.js":"91581fbc3c7f"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.MeaadDesignSystem_54b82a = window.MeaadDesignSystem_54b82a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/display/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const sizes = {
  sm: 32,
  md: 42,
  lg: 56
};

// deterministic pastel-teal from initials
function initials(name = '') {
  const parts = String(name).trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '؟';
}
function Avatar({
  name = '',
  src,
  size = 'md',
  style,
  ...rest
}) {
  const d = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      width: d,
      height: d,
      borderRadius: '50%',
      flex: '0 0 auto',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      background: 'var(--brand-subtle)',
      color: 'var(--teal-700)',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-bold)',
      fontSize: d * 0.38,
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials(name));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  neutral: {
    bg: 'var(--gray-100)',
    fg: 'var(--gray-700)'
  },
  brand: {
    bg: 'var(--brand-subtle)',
    fg: 'var(--teal-700)'
  },
  success: {
    bg: 'var(--success-subtle)',
    fg: 'var(--green-600)'
  },
  warning: {
    bg: 'var(--warning-subtle)',
    fg: 'var(--amber-700)'
  },
  danger: {
    bg: 'var(--danger-subtle)',
    fg: 'var(--red-600)'
  },
  info: {
    bg: 'var(--info-subtle)',
    fg: 'var(--blue-600)'
  }
};
function Badge({
  children,
  tone = 'neutral',
  dot = false,
  style,
  ...rest
}) {
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-bold)',
      fontSize: 'var(--text-xs)',
      color: t.fg,
      background: t.bg,
      padding: '4px 12px',
      borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'currentColor',
      flex: '0 0 auto'
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  children,
  interactive = false,
  padding = 24,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => interactive && setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      padding,
      transition: 'box-shadow .18s ease, transform .18s ease',
      transform: hover ? 'translateY(-2px)' : 'none',
      cursor: interactive ? 'pointer' : 'default',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/Field.jsx
try { (() => {
// Form field wrapper: label + control + hint/error.
function Field({
  label,
  required = false,
  hint,
  error,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-medium)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-strong)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--danger)',
      marginInlineStart: 4
    }
  }, "*")), children, error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)',
      color: 'var(--danger)'
    }
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked = false,
  onChange,
  disabled = false,
  label,
  style
}) {
  const toggle = () => {
    if (!disabled) onChange?.(!checked);
  };
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    role: "switch",
    "aria-checked": checked,
    tabIndex: 0,
    onClick: toggle,
    onKeyDown: e => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle();
      }
    },
    style: {
      width: 46,
      height: 27,
      borderRadius: 'var(--radius-pill)',
      position: 'relative',
      background: checked ? 'var(--brand)' : 'var(--gray-300)',
      transition: 'background .18s ease',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      insetInlineStart: checked ? 22 : 3,
      width: 21,
      height: 21,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: 'var(--shadow-sm)',
      transition: 'inset-inline-start .18s ease'
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Textarea({
  invalid = false,
  disabled = false,
  rows = 4,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--leading-normal)',
      color: 'var(--text-strong)',
      background: disabled ? 'var(--surface-sunken)' : 'var(--white)',
      border: `1px solid ${invalid ? 'var(--danger)' : focus ? 'var(--brand)' : 'var(--border-default)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      resize: 'vertical',
      boxShadow: focus ? 'var(--shadow-focus)' : 'none',
      outline: 'none',
      transition: 'border-color .15s ease, box-shadow .15s ease',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/icon/Icon.jsx
try { (() => {
// Meaad Icon — thin wrapper over Lucide (loaded globally as window.lucide).
// Accepts kebab-case or PascalCase Lucide names. Renders a currentColor,
// 1.75px-stroke outline SVG at the given size. RTL-safe.
const toPascal = n => String(n).replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
function Icon({
  name,
  size = 20,
  stroke = 1.75,
  color = 'currentColor',
  style,
  ...rest
}) {
  const lucide = typeof window !== 'undefined' ? window.lucide : null;
  const node = lucide && (lucide[toPascal(name)] || lucide.icons?.[toPascal(name)]);
  const base = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: {
      display: 'inline-block',
      flex: '0 0 auto',
      ...style
    },
    ...rest
  };
  if (!node) {
    // graceful fallback: hollow rounded square
    return React.createElement('svg', base, React.createElement('rect', {
      x: 4,
      y: 4,
      width: 16,
      height: 16,
      rx: 4
    }));
  }
  // Lucide export shapes: ["svg", attrs, [children]] (UMD) OR [[tag, attrs], …] (IconNode)
  const childNodes = Array.isArray(node) && node.length === 3 && Array.isArray(node[2]) ? node[2] : Array.isArray(node[0]) ? node : [];
  const children = childNodes.map((c, i) => React.createElement(c[0], {
    key: i,
    ...c[1]
  }));
  return React.createElement('svg', base, children);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/icon/Icon.jsx", error: String((e && e.message) || e) }); }

// components/display/StatusPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Appointment + notification lifecycle statuses (from the PRD).
const STATUS = {
  scheduled: {
    label: 'مجدول',
    color: 'var(--status-scheduled)',
    icon: 'clock'
  },
  sent: {
    label: 'تم الإرسال',
    color: 'var(--status-sent)',
    icon: 'send'
  },
  delivered: {
    label: 'تم الاستلام',
    color: 'var(--status-delivered)',
    icon: 'check-check'
  },
  failed: {
    label: 'فشل',
    color: 'var(--status-failed)',
    icon: 'x-circle'
  },
  confirmed: {
    label: 'مؤكد',
    color: 'var(--status-confirmed)',
    icon: 'check-circle'
  },
  pending: {
    label: 'قيد الانتظار',
    color: 'var(--status-pending)',
    icon: 'clock'
  },
  cancelled: {
    label: 'ملغي',
    color: 'var(--status-cancelled)',
    icon: 'x-circle'
  },
  paid: {
    label: 'مدفوع',
    color: 'var(--green-500)',
    icon: 'check-circle'
  },
  refunded: {
    label: 'مسترد',
    color: 'var(--gray-500)',
    icon: 'undo-2'
  },
  overdue: {
    label: 'متأخر',
    color: 'var(--red-500)',
    icon: 'circle-alert'
  }
};

// tint a status color into a soft background using color-mix
const soft = c => `color-mix(in srgb, ${c} 12%, white)`;
function StatusPill({
  status = 'scheduled',
  label,
  showIcon = true,
  style,
  ...rest
}) {
  const s = STATUS[status] || STATUS.scheduled;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-bold)',
      fontSize: 'var(--text-xs)',
      color: s.color,
      background: soft(s.color),
      padding: '5px 12px',
      borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), showIcon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: s.icon,
    size: 14
  }), label || s.label);
}
StatusPill.statuses = Object.keys(STATUS);
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  info: {
    fg: 'var(--blue-600)',
    bg: 'var(--info-subtle)',
    bd: 'var(--blue-500)',
    icon: 'info'
  },
  success: {
    fg: 'var(--green-600)',
    bg: 'var(--success-subtle)',
    bd: 'var(--green-500)',
    icon: 'check-circle'
  },
  warning: {
    fg: 'var(--amber-700)',
    bg: 'var(--warning-subtle)',
    bd: 'var(--amber-500)',
    icon: 'triangle-alert'
  },
  danger: {
    fg: 'var(--red-600)',
    bg: 'var(--danger-subtle)',
    bd: 'var(--red-500)',
    icon: 'circle-alert'
  }
};
function Alert({
  tone = 'info',
  title,
  children,
  onClose,
  style,
  ...rest
}) {
  const t = tones[tone] || tones.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      gap: 12,
      background: t.bg,
      border: `1px solid ${t.bd}`,
      borderRadius: 'var(--radius-md)',
      padding: '14px 16px',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.fg,
      display: 'flex',
      flex: '0 0 auto',
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)',
      lineHeight: 'var(--leading-snug)'
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-bold)',
      color: t.fg,
      marginBottom: children ? 3 : 0
    }
  }, title), children), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "\u0625\u063A\u0644\u0627\u0642",
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      display: 'flex',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 18
  })));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
function Modal({
  open = true,
  title,
  onClose,
  children,
  footer,
  width = 520,
  style
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(16,24,24,0.45)',
      backdropFilter: 'blur(3px)',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      maxWidth: width,
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-lg)',
      overflow: 'hidden',
      ...style
    }
  }, (title || onClose) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '20px 24px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-bold)',
      fontSize: 'var(--text-lg)',
      color: 'var(--text-strong)'
    }
  }, title), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "\u0625\u063A\u0644\u0627\u0642",
    style: {
      background: 'var(--surface-sunken)',
      border: 'none',
      width: 34,
      height: 34,
      borderRadius: '50%',
      cursor: 'pointer',
      color: 'var(--text-body)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      overflowY: 'auto',
      fontFamily: 'var(--font-body)',
      color: 'var(--text-body)'
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      justifyContent: 'flex-start',
      padding: '16px 24px',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--gray-50)'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const sizes = {
  sm: {
    padding: '0 16px',
    height: 36,
    font: 'var(--text-sm)'
  },
  md: {
    padding: '0 22px',
    height: 44,
    font: 'var(--text-base)'
  },
  lg: {
    padding: '0 30px',
    height: 54,
    font: 'var(--text-md)'
  }
};
const variants = {
  primary: {
    background: 'var(--brand)',
    color: 'var(--text-on-brand)',
    border: '1px solid var(--brand)',
    boxShadow: 'var(--shadow-brand)'
  },
  secondary: {
    background: 'var(--white)',
    color: 'var(--teal-700)',
    border: '1px solid var(--border-default)',
    boxShadow: 'var(--shadow-xs)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--teal-700)',
    border: '1px solid transparent'
  },
  danger: {
    background: 'var(--danger)',
    color: '#fff',
    border: '1px solid var(--danger)',
    boxShadow: '0 8px 20px rgba(226,61,61,.25)'
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconStart,
  iconEnd,
  block = false,
  disabled = false,
  style,
  ...rest
}) {
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
      display: block ? 'flex' : 'inline-flex',
      width: block ? '100%' : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-bold)',
      fontSize: s.font,
      height: s.height,
      padding: s.padding,
      borderRadius: 'var(--radius-pill)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'transform .15s ease, filter .15s ease, box-shadow .15s ease',
      whiteSpace: 'nowrap',
      ...v,
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'scale(.97)';
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = 'scale(1)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.filter = 'none';
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.filter = 'brightness(.94)';
    }
  }, rest), iconStart && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconStart,
    size: size === 'lg' ? 20 : 18
  }), children, iconEnd && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconEnd,
    size: size === 'lg' ? 20 : 18
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  checked = false,
  onChange,
  disabled = false,
  label,
  style
}) {
  const toggle = () => {
    if (!disabled) onChange?.(!checked);
  };
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    role: "checkbox",
    "aria-checked": checked,
    tabIndex: 0,
    onClick: toggle,
    onKeyDown: e => {
      if (e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    },
    style: {
      width: 22,
      height: 22,
      borderRadius: 7,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: checked ? 'var(--brand)' : 'var(--white)',
      border: `1.5px solid ${checked ? 'var(--brand)' : 'var(--border-strong)'}`,
      transition: 'background .15s ease, border-color .15s ease',
      flex: '0 0 auto'
    }
  }, checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 15,
    color: "#fff",
    stroke: 3
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)'
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const sizes = {
  sm: 34,
  md: 42,
  lg: 50
};
const variants = {
  solid: {
    background: 'var(--brand)',
    color: '#fff',
    border: '1px solid var(--brand)'
  },
  soft: {
    background: 'var(--brand-subtle)',
    color: 'var(--teal-700)',
    border: '1px solid transparent'
  },
  outline: {
    background: 'var(--white)',
    color: 'var(--teal-700)',
    border: '1px solid var(--border-default)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid transparent'
  }
};
function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  disabled = false,
  style,
  ...rest
}) {
  const d = sizes[size] || sizes.md;
  const v = variants[variant] || variants.ghost;
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": label,
    title: label,
    disabled: disabled,
    style: {
      width: d,
      height: d,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-pill)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'filter .15s ease, transform .15s ease',
      ...v,
      ...style
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.filter = 'brightness(.92)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.filter = 'none';
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === 'sm' ? 16 : size === 'lg' ? 22 : 19
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  iconStart,
  iconEnd,
  invalid = false,
  disabled = false,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, iconStart && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      insetInlineStart: 14,
      color: 'var(--text-muted)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconStart,
    size: 18
  })), /*#__PURE__*/React.createElement("input", _extends({
    disabled: disabled,
    onFocus: e => {
      setFocus(true);
      rest.onFocus?.(e);
    },
    onBlur: e => {
      setFocus(false);
      rest.onBlur?.(e);
    },
    style: {
      width: '100%',
      height: 46,
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-base)',
      color: 'var(--text-strong)',
      background: disabled ? 'var(--surface-sunken)' : 'var(--white)',
      border: `1px solid ${invalid ? 'var(--danger)' : focus ? 'var(--brand)' : 'var(--border-default)'}`,
      borderRadius: 'var(--radius-md)',
      padding: `0 ${iconEnd ? 44 : 16}px 0 ${iconStart ? 44 : 16}px`,
      boxShadow: focus ? 'var(--shadow-focus)' : 'none',
      outline: 'none',
      transition: 'border-color .15s ease, box-shadow .15s ease',
      opacity: disabled ? 0.6 : 1,
      ...style
    }
  }, rest)), iconEnd && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      insetInlineEnd: 14,
      color: 'var(--text-muted)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconEnd,
    size: 18
  })));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  children,
  invalid = false,
  disabled = false,
  placeholder,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      height: 46,
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-base)',
      color: 'var(--text-strong)',
      background: disabled ? 'var(--surface-sunken)' : 'var(--white)',
      border: `1px solid ${invalid ? 'var(--danger)' : focus ? 'var(--brand)' : 'var(--border-default)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '0 16px 0 44px',
      appearance: 'none',
      boxShadow: focus ? 'var(--shadow-focus)' : 'none',
      outline: 'none',
      transition: 'border-color .15s ease, box-shadow .15s ease',
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true,
    hidden: true
  }, placeholder), children), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      insetInlineStart: 14,
      color: 'var(--text-muted)',
      pointerEvents: 'none',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 18
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SidebarItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SidebarItem({
  icon,
  label,
  active = false,
  badge,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      textAlign: 'start',
      fontFamily: 'var(--font-display)',
      fontWeight: active ? 'var(--fw-bold)' : 'var(--fw-medium)',
      fontSize: 'var(--text-base)',
      color: active ? 'var(--teal-700)' : hover ? 'var(--text-strong)' : 'var(--text-body)',
      background: active ? 'var(--brand-subtle)' : hover ? 'var(--surface-sunken)' : 'transparent',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      padding: '11px 14px',
      cursor: 'pointer',
      transition: 'background .15s ease, color .15s ease',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20,
    color: active ? 'var(--brand)' : 'currentColor'
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, label), badge != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-bold)',
      fontSize: 'var(--text-xs)',
      background: active ? 'var(--brand)' : 'var(--gray-300)',
      color: active ? '#fff' : 'var(--gray-700)',
      minWidth: 20,
      height: 20,
      padding: '0 6px',
      borderRadius: 'var(--radius-pill)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, badge));
}
Object.assign(__ds_scope, { SidebarItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SidebarItem.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  tabs = [],
  value,
  onChange,
  style
}) {
  const active = value ?? tabs[0]?.value;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      background: 'var(--surface-sunken)',
      padding: 4,
      borderRadius: 'var(--radius-pill)',
      ...style
    }
  }, tabs.map(t => {
    const on = t.value === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.value,
      onClick: () => onChange?.(t.value),
      style: {
        flex: 1,
        fontFamily: 'var(--font-display)',
        fontWeight: 'var(--fw-bold)',
        fontSize: 'var(--text-sm)',
        color: on ? 'var(--teal-700)' : 'var(--text-muted)',
        background: on ? 'var(--white)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-pill)',
        padding: '9px 18px',
        cursor: 'pointer',
        boxShadow: on ? 'var(--shadow-xs)' : 'none',
        transition: 'all .15s ease',
        whiteSpace: 'nowrap'
      }
    }, t.label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/AccountingScreen.jsx
try { (() => {
// Accounting screen — المحاسبة
const {
  Card,
  Button,
  Badge,
  Icon,
  IconButton,
  StatusPill,
  Tabs,
  Input
} = window.MeaadDesignSystem_54b82a;
const EGP = n => n.toLocaleString('ar-EG') + ' ج.م';
function InvoiceRow({
  v
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '0.8fr 1.2fr 1.3fr 0.8fr 0.9fr 0.9fr auto',
      gap: 14,
      alignItems: 'center',
      padding: '15px 20px',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      direction: 'ltr',
      textAlign: 'right'
    }
  }, v.id), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      color: 'var(--text-strong)',
      fontSize: 'var(--text-sm)'
    }
  }, v.customer), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-body)',
      fontSize: 'var(--text-sm)'
    }
  }, v.service), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)'
    }
  }, v.doctor)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      fontSize: 'var(--text-sm)'
    }
  }, v.date), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      color: 'var(--text-body)',
      fontSize: 'var(--text-sm)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "credit-card",
    size: 14,
    color: "var(--text-muted)"
  }), v.method), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      color: 'var(--text-strong)'
    }
  }, EGP(v.amount)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: v.status
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "receipt",
    label: "\u0639\u0631\u0636 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629",
    variant: "soft",
    size: "sm"
  })));
}
function AccountingScreen() {
  const d = window.MeaadData;
  const [tab, setTab] = React.useState('all');
  const paid = d.invoices.filter(v => v.status === 'paid');
  const pending = d.invoices.filter(v => v.status === 'pending');
  const total = paid.reduce((s, v) => s + v.amount, 0);
  const due = pending.reduce((s, v) => s + v.amount, 0);
  const filtered = tab === 'all' ? d.invoices : d.invoices.filter(v => v.status === tab);
  const stats = [{
    label: 'إيراد اليوم',
    value: EGP(total),
    icon: 'wallet',
    tone: 'var(--brand)'
  }, {
    label: 'مبالغ معلّقة',
    value: EGP(due),
    icon: 'hourglass',
    tone: 'var(--amber-600)'
  }, {
    label: 'فواتير مدفوعة',
    value: paid.length,
    icon: 'check-circle',
    tone: 'var(--green-500)'
  }, {
    label: 'مستردّات',
    value: d.invoices.filter(v => v.status === 'refunded').length,
    icon: 'undo-2',
    tone: 'var(--gray-500)'
  }];
  const max = Math.max(...d.revenueByService.map(r => r.value));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 16
    }
  }, stats.map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.label,
    padding: 18,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: 'var(--radius-md)',
      background: `color-mix(in srgb, ${s.tone} 12%, white)`,
      color: s.tone,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      fontSize: 'var(--text-xl)',
      color: 'var(--text-strong)',
      lineHeight: 1.1
    }
  }, s.value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, s.label))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.7fr 1fr',
      gap: 22,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: 0
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 'var(--text-lg)',
      color: 'var(--text-strong)',
      flex: 1
    }
  }, "\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631"), /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    tabs: [{
      value: 'all',
      label: 'الكل'
    }, {
      value: 'paid',
      label: 'مدفوعة'
    }, {
      value: 'pending',
      label: 'معلّقة'
    }, {
      value: 'refunded',
      label: 'مستردّة'
    }],
    style: {
      maxWidth: 360
    }
  })), /*#__PURE__*/React.createElement("div", null, filtered.map(v => /*#__PURE__*/React.createElement(InvoiceRow, {
    key: v.id,
    v: v
  })))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chart-pie",
    size: 20,
    color: "var(--brand)"
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 'var(--text-lg)',
      color: 'var(--text-strong)'
    }
  }, "\u0627\u0644\u0625\u064A\u0631\u0627\u062F \u062D\u0633\u0628 \u0627\u0644\u062E\u062F\u0645\u0629")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, d.revenueByService.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.name
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 'var(--text-sm)',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-body)',
      fontFamily: 'var(--font-display)',
      fontWeight: 700
    }
  }, r.name), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)'
    }
  }, r.value, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 9,
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-pill)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${r.value / max * 100}%`,
      height: '100%',
      background: 'var(--brand)',
      borderRadius: 'var(--radius-pill)'
    }
  }))))))));
}
window.AccountingScreen = AccountingScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/AccountingScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/AdminShell.jsx
try { (() => {
// Admin layout shell — RTL sidebar + topbar
const {
  SidebarItem,
  Avatar,
  IconButton,
  Icon
} = window.MeaadDesignSystem_54b82a;
function AdminShell({
  active,
  onNav,
  title,
  actions,
  children
}) {
  const nav = [{
    key: 'dashboard',
    icon: 'layout-dashboard',
    label: 'لوحة التحكم'
  }, {
    key: 'appointments',
    icon: 'calendar',
    label: 'المواعيد',
    badge: 8
  }, {
    key: 'customers',
    icon: 'users',
    label: 'العملاء'
  }, {
    key: 'doctors',
    icon: 'stethoscope',
    label: 'الأطباء'
  }, {
    key: 'accounting',
    icon: 'wallet',
    label: 'المحاسبة'
  }, {
    key: 'reminders',
    icon: 'bell',
    label: 'التذكيرات',
    badge: 3
  }, {
    key: 'settings',
    icon: 'settings',
    label: 'الإعدادات'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--surface-page)'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 262,
      flex: '0 0 auto',
      background: 'var(--white)',
      borderInlineStart: '1px solid var(--border-subtle)',
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      position: 'sticky',
      top: 0,
      height: '100vh'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '6px 8px 18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 42,
      borderRadius: 'var(--radius-md)',
      background: 'var(--brand)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      fontSize: 18,
      boxShadow: 'var(--shadow-brand)'
    }
  }, "\u0645"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      fontSize: 20,
      color: 'var(--text-strong)',
      lineHeight: 1
    }
  }, "\u0645\u064A\u0639\u0627\u062F"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, "\u0644\u0648\u062D\u0629 \u0627\u0644\u0639\u064A\u0627\u062F\u0629"))), nav.map(n => /*#__PURE__*/React.createElement(SidebarItem, {
    key: n.key,
    icon: n.icon,
    label: n.label,
    badge: n.badge,
    active: active === n.key,
    onClick: () => onNav(n.key)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 8px',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u064A\u0627\u062F\u0629",
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 13,
      color: 'var(--text-strong)'
    }
  }, "\u0645. \u0639\u0628\u062F\u0627\u0644\u0631\u062D\u0645\u0646"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, "\u0645\u0633\u0624\u0648\u0644")), /*#__PURE__*/React.createElement(IconButton, {
    icon: "log-out",
    label: "\u062E\u0631\u0648\u062C",
    size: "sm"
  }))), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 5,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '16px 28px',
      background: 'rgba(255,255,255,.8)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 24,
      color: 'var(--text-strong)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), actions, /*#__PURE__*/React.createElement(IconButton, {
    icon: "bell",
    label: "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A",
    variant: "soft"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 28,
      flex: 1
    }
  }, children)));
}
window.AdminShell = AdminShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/AdminShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/AppointmentModal.jsx
try { (() => {
// Add / Edit appointment modal — the PRD's admin booking form
const {
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  Button,
  Alert,
  Checkbox
} = window.MeaadDesignSystem_54b82a;
function AppointmentModal({
  open,
  onClose,
  editing,
  onSave
}) {
  const d = window.MeaadData;
  const [showErr, setShowErr] = React.useState(false);
  const [newCustomer, setNewCustomer] = React.useState(false);
  const isEdit = !!editing;
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    width: 620,
    title: isEdit ? 'تعديل الموعد' : 'إضافة موعد',
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      iconStart: "check",
      onClick: onSave
    }, isEdit ? 'حفظ التعديل' : 'تأكيد حجز الموعد'), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: onClose
    }, "\u0625\u0644\u063A\u0627\u0621"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), isEdit && /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      iconStart: "x"
    }, "\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0648\u0639\u062F"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, isEdit && /*#__PURE__*/React.createElement(Alert, {
    tone: "info"
  }, "\u0633\u064A\u064F\u0639\u0627\u062F \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062A\u0648\u0641\u0651\u0631 \u0642\u0628\u0644 \u0627\u0644\u062D\u0641\u0638\u060C \u0648\u0633\u062A\u064F\u0639\u0627\u062F \u062C\u062F\u0648\u0644\u0629 \u0627\u0644\u062A\u0630\u0643\u064A\u0631\u0627\u062A \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B."), /*#__PURE__*/React.createElement(Checkbox, {
    checked: newCustomer,
    onChange: setNewCustomer,
    label: "\u0625\u0646\u0634\u0627\u0621 \u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F \u0628\u062F\u0644\u0627\u064B \u0645\u0646 \u0627\u062E\u062A\u064A\u0627\u0631 \u0639\u0645\u064A\u0644 \u0645\u0648\u062C\u0648\u062F"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, newCustomer ? /*#__PURE__*/React.createElement(Field, {
    label: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    iconStart: "user-round",
    placeholder: "\u0627\u0643\u062A\u0628 \u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644",
    defaultValue: editing?.customer
  })) : /*#__PURE__*/React.createElement(Field, {
    label: "\u0627\u0644\u0639\u0645\u064A\u0644",
    required: true
  }, /*#__PURE__*/React.createElement(Select, {
    placeholder: "\u0627\u062E\u062A\u0631 \u0639\u0645\u064A\u0644\u0627\u064B"
  }, /*#__PURE__*/React.createElement("option", null, "\u0633\u0627\u0631\u0629 \u0639\u0628\u062F\u0627\u0644\u0644\u0647"), /*#__PURE__*/React.createElement("option", null, "\u0645\u062D\u0645\u062F \u0639\u0627\u062F\u0644"), /*#__PURE__*/React.createElement("option", null, "\u0644\u064A\u0644\u0649 \u0641\u0624\u0627\u062F"))), /*#__PURE__*/React.createElement(Field, {
    label: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    iconStart: "phone",
    placeholder: "01xxxxxxxxx",
    defaultValue: editing?.phone
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u0627\u0644\u0641\u0631\u0639",
    required: true
  }, /*#__PURE__*/React.createElement(Select, {
    placeholder: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0641\u0631\u0639",
    defaultValue: editing?.branch
  }, d.branches.map(b => /*#__PURE__*/React.createElement("option", {
    key: b
  }, b)))), /*#__PURE__*/React.createElement(Field, {
    label: "\u0646\u0648\u0639 \u0627\u0644\u062E\u062F\u0645\u0629",
    required: true
  }, /*#__PURE__*/React.createElement(Select, {
    placeholder: "\u0627\u062E\u062A\u0631 \u0627\u0644\u062E\u062F\u0645\u0629",
    defaultValue: editing?.service
  }, d.services.map(s => /*#__PURE__*/React.createElement("option", {
    key: s
  }, s)))), /*#__PURE__*/React.createElement(Field, {
    label: "\u0627\u0644\u0637\u0628\u064A\u0628",
    required: true
  }, /*#__PURE__*/React.createElement(Select, {
    placeholder: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0637\u0628\u064A\u0628",
    defaultValue: editing?.doctor
  }, d.doctors.map(x => /*#__PURE__*/React.createElement("option", {
    key: x.name
  }, x.name)))), /*#__PURE__*/React.createElement(Field, {
    label: "\u062D\u0627\u0644\u0629 \u0627\u0644\u062D\u062C\u0632"
  }, /*#__PURE__*/React.createElement(Select, {
    defaultValue: editing?.status || 'confirmed'
  }, /*#__PURE__*/React.createElement("option", {
    value: "confirmed"
  }, "\u0645\u0624\u0643\u062F"), /*#__PURE__*/React.createElement("option", {
    value: "pending"
  }, "\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631"))), /*#__PURE__*/React.createElement(Field, {
    label: "\u0627\u0644\u062A\u0627\u0631\u064A\u062E",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    iconStart: "calendar",
    placeholder: "\u0627\u062E\u062A\u0631 \u0627\u0644\u062A\u0627\u0631\u064A\u062E",
    defaultValue: editing?.date
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u0627\u0644\u0648\u0642\u062A",
    required: true,
    error: showErr ? 'هذا الموعد غير متاح، يرجى اختيار موعد آخر.' : undefined
  }, /*#__PURE__*/React.createElement(Input, {
    iconStart: "clock",
    invalid: showErr,
    placeholder: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0648\u0642\u062A",
    defaultValue: editing?.time,
    onFocus: () => setShowErr(false)
  }))), /*#__PURE__*/React.createElement(Field, {
    label: "\u0645\u0644\u0627\u062D\u0638\u0627\u062A"
  }, /*#__PURE__*/React.createElement(Textarea, {
    rows: 2,
    placeholder: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0644\u0627\u062D\u0638\u0627\u062A (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowErr(true),
    style: {
      alignSelf: 'flex-start',
      background: 'none',
      border: 'none',
      color: 'var(--text-link)',
      cursor: 'pointer',
      fontSize: 'var(--text-xs)',
      fontFamily: 'var(--font-body)',
      textDecoration: 'underline'
    }
  }, "\u0645\u062D\u0627\u0643\u0627\u0629 \u062A\u0639\u0627\u0631\u0636 \u0641\u064A \u0627\u0644\u062A\u0648\u0641\u0651\u0631 (Double Booking)")));
}
window.AppointmentModal = AppointmentModal;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/AppointmentModal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/AppointmentsScreen.jsx
try { (() => {
// Appointments list screen
const {
  Card,
  Tabs,
  Button,
  StatusPill,
  Avatar,
  IconButton,
  Icon,
  Input
} = window.MeaadDesignSystem_54b82a;
function AppointmentRow({
  a,
  onEdit
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr 1fr 0.9fr auto',
      gap: 16,
      alignItems: 'center',
      padding: '16px 20px',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: a.customer,
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, a.customer), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-mono)',
      direction: 'ltr',
      textAlign: 'right'
    }
  }, a.phone))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: 'var(--text-body)',
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-sm)'
    }
  }, a.service), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)'
    }
  }, a.doctor)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      color: 'var(--text-body)',
      fontSize: 'var(--text-sm)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 15,
    color: "var(--text-muted)"
  }), a.branch), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      color: 'var(--text-body)',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 'var(--text-sm)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 15,
    color: "var(--brand)"
  }), a.date, " \xB7 ", a.time), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: a.status
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "pencil",
    label: "\u062A\u0639\u062F\u064A\u0644",
    variant: "soft",
    size: "sm",
    onClick: () => onEdit(a)
  })));
}
function AppointmentsScreen({
  appointments,
  onEdit
}) {
  const [tab, setTab] = React.useState('today');
  const [q, setQ] = React.useState('');
  const stats = [{
    label: 'مواعيد اليوم',
    value: 12,
    icon: 'calendar-days',
    tone: 'var(--brand)'
  }, {
    label: 'مؤكدة',
    value: 9,
    icon: 'check-circle',
    tone: 'var(--green-500)'
  }, {
    label: 'قيد الانتظار',
    value: 2,
    icon: 'clock',
    tone: 'var(--amber-600)'
  }, {
    label: 'تذكيرات مجدولة',
    value: 24,
    icon: 'bell',
    tone: 'var(--blue-500)'
  }];
  const list = appointments.filter(a => a.customer.includes(q) || a.doctor.includes(q));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 16
    }
  }, stats.map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.label,
    padding: 18,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: 'var(--radius-md)',
      background: `color-mix(in srgb, ${s.tone} 12%, white)`,
      color: s.tone,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 22
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      fontSize: 'var(--text-2xl)',
      color: 'var(--text-strong)',
      lineHeight: 1
    }
  }, s.value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, s.label))))), /*#__PURE__*/React.createElement(Card, {
    padding: 0
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    tabs: [{
      value: 'today',
      label: 'اليوم'
    }, {
      value: 'upcoming',
      label: 'القادمة'
    }, {
      value: 'all',
      label: 'الكل'
    }],
    style: {
      maxWidth: 320
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      maxWidth: 280
    }
  }, /*#__PURE__*/React.createElement(Input, {
    iconStart: "search",
    placeholder: "\u0627\u0628\u062D\u062B \u0639\u0646 \u0639\u0645\u064A\u0644 \u0623\u0648 \u0637\u0628\u064A\u0628",
    value: q,
    onChange: e => setQ(e.target.value)
  }))), /*#__PURE__*/React.createElement("div", null, list.map(a => /*#__PURE__*/React.createElement(AppointmentRow, {
    key: a.id,
    a: a,
    onEdit: onEdit
  })), list.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: 'center',
      color: 'var(--text-muted)'
    }
  }, "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0648\u0627\u0639\u064A\u062F \u0645\u0637\u0627\u0628\u0642\u0629"))));
}
window.AppointmentsScreen = AppointmentsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/AppointmentsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/DoctorsScreen.jsx
try { (() => {
// Doctors management screen — إدارة الأطباء
const {
  Card,
  Button,
  Badge,
  Avatar,
  Icon,
  IconButton,
  StatusPill,
  Input,
  Switch
} = window.MeaadDesignSystem_54b82a;
function DoctorCard({
  d,
  onToggle
}) {
  return /*#__PURE__*/React.createElement(Card, {
    padding: 20,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: d.name,
    size: "lg"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      color: 'var(--text-strong)',
      fontSize: 'var(--text-md)'
    }
  }, d.name)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "brand"
  }, d.spec), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    size: 14,
    color: "var(--amber-500)"
  }), d.rating))), /*#__PURE__*/React.createElement(StatusPill, {
    status: d.active ? 'confirmed' : 'cancelled',
    label: d.active ? 'نشط' : 'موقوف'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px 14px',
      fontSize: 'var(--text-sm)'
    }
  }, /*#__PURE__*/React.createElement(Row, {
    icon: "map-pin",
    text: d.branch
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "phone",
    text: /*#__PURE__*/React.createElement("span", {
      style: {
        direction: 'ltr',
        display: 'inline-block'
      }
    }, d.phone)
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "calendar",
    text: d.days
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "clock",
    text: d.hours
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }
  }, d.services.map(s => /*#__PURE__*/React.createElement(Badge, {
    key: s,
    tone: "neutral"
  }, s))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      paddingTop: 12,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "users",
    size: 16,
    color: "var(--text-muted)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, d.patients, " \u0645\u0631\u064A\u0636"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Switch, {
    checked: d.active,
    onChange: onToggle,
    label: "\u0645\u062A\u0627\u062D \u0644\u0644\u062D\u062C\u0632"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "pencil",
    label: "\u062A\u0639\u062F\u064A\u0644",
    variant: "soft",
    size: "sm"
  })));
}
function Row({
  icon,
  text
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      color: 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 15,
    color: "var(--text-muted)"
  }), /*#__PURE__*/React.createElement("span", null, text));
}
function DoctorsScreen() {
  const [docs, setDocs] = React.useState(window.MeaadData.doctors);
  const [q, setQ] = React.useState('');
  const toggle = i => setDocs(list => list.map((x, k) => k === i ? {
    ...x,
    active: !x.active
  } : x));
  const list = docs.filter(d => d.name.includes(q) || d.spec.includes(q));
  const stats = [{
    label: 'إجمالي الأطباء',
    value: docs.length,
    icon: 'stethoscope',
    tone: 'var(--brand)'
  }, {
    label: 'نشط الآن',
    value: docs.filter(d => d.active).length,
    icon: 'circle-check',
    tone: 'var(--green-500)'
  }, {
    label: 'التخصصات',
    value: new Set(docs.map(d => d.spec)).size,
    icon: 'layers',
    tone: 'var(--amber-600)'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 16
    }
  }, stats.map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.label,
    padding: 18,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: 'var(--radius-md)',
      background: `color-mix(in srgb, ${s.tone} 12%, white)`,
      color: s.tone,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 22
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      fontSize: 'var(--text-2xl)',
      color: 'var(--text-strong)',
      lineHeight: 1
    }
  }, s.value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, s.label))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 300
    }
  }, /*#__PURE__*/React.createElement(Input, {
    iconStart: "search",
    placeholder: "\u0627\u0628\u062D\u062B \u0628\u0627\u0633\u0645 \u0627\u0644\u0637\u0628\u064A\u0628 \u0623\u0648 \u0627\u0644\u062A\u062E\u0635\u0635",
    value: q,
    onChange: e => setQ(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: 16
    }
  }, list.map((d, i) => /*#__PURE__*/React.createElement(DoctorCard, {
    key: d.name,
    d: d,
    onToggle: () => toggle(docs.indexOf(d))
  }))));
}
window.DoctorsScreen = DoctorsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/DoctorsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/ReminderSettings.jsx
try { (() => {
// Reminder settings screen — PRD sections 5, 6, 7, 8
const {
  Card,
  Switch,
  Icon,
  Button,
  StatusPill,
  Badge
} = window.MeaadDesignSystem_54b82a;
function SettingRow({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '18px 0',
      borderTop: '1px solid var(--border-subtle)',
      ...style
    }
  }, children);
}
function ReminderSettings() {
  const d = window.MeaadData;
  const [rem, setRem] = React.useState(d.reminders);
  const [chan, setChan] = React.useState(d.channels);
  const toggleRem = i => setRem(r => r.map((x, k) => k === i ? {
    ...x,
    on: !x.on
  } : x));
  const toggleChan = i => setChan(c => c.map((x, k) => k === i ? {
    ...x,
    on: !x.on
  } : x));
  const log = [{
    customer: 'سارة عبدالله',
    when: 'قبل 24 ساعة',
    channel: 'WhatsApp',
    status: 'delivered'
  }, {
    customer: 'محمد عادل',
    when: 'قبل 24 ساعة',
    channel: 'SMS',
    status: 'sent'
  }, {
    customer: 'ليلى فؤاد',
    when: 'قبل ساعة',
    channel: 'WhatsApp',
    status: 'scheduled'
  }, {
    customer: 'كريم وليد',
    when: 'قبل 24 ساعة',
    channel: 'SMS',
    status: 'failed'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.1fr 1fr',
      gap: 22,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell-ring",
    size: 20,
    color: "var(--brand)"
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 'var(--text-lg)',
      color: 'var(--text-strong)'
    }
  }, "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0630\u0643\u064A\u0631")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 4px',
      color: 'var(--text-muted)',
      fontSize: 'var(--text-sm)'
    }
  }, "\u064A\u0645\u0643\u0646 \u062A\u0634\u063A\u064A\u0644 \u0623\u0648 \u0625\u064A\u0642\u0627\u0641 \u0643\u0644 \u062A\u0630\u0643\u064A\u0631 \u0628\u0634\u0643\u0644 \u0645\u0633\u062A\u0642\u0644."), rem.map((r, i) => /*#__PURE__*/React.createElement(SettingRow, {
    key: r.id
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 42,
      borderRadius: 'var(--radius-md)',
      background: 'var(--amber-50)',
      color: 'var(--amber-600)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alarm-clock",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, r.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, r.timing)), /*#__PURE__*/React.createElement(Switch, {
    checked: r.on,
    onChange: () => toggleRem(i)
  })))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 20,
    color: "var(--brand)"
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 'var(--text-lg)',
      color: 'var(--text-strong)'
    }
  }, "\u0642\u0646\u0648\u0627\u062A \u0627\u0644\u0625\u0631\u0633\u0627\u0644")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, chan.map((c, i) => /*#__PURE__*/React.createElement(SettingRow, {
    key: c.id,
    style: i === 0 ? {
      borderTop: 'none',
      paddingTop: 6
    } : {}
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 42,
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-sunken)',
      color: 'var(--teal-700)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: c.icon,
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, c.label), /*#__PURE__*/React.createElement(Switch, {
    checked: c.on,
    onChange: () => toggleChan(i)
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      background: 'var(--gray-900)',
      border: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
      color: 'var(--teal-200)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-square-text",
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 'var(--text-sm)'
    }
  }, "\u0645\u0639\u0627\u064A\u0646\u0629 \u0646\u0635 \u0627\u0644\u062A\u0630\u0643\u064A\u0631")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--white)',
      borderRadius: 'var(--radius-lg)',
      padding: 18,
      color: 'var(--text-body)',
      fontSize: 'var(--text-sm)',
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      color: 'var(--text-strong)',
      marginBottom: 6
    }
  }, "\u062A\u0630\u0643\u064A\u0631 \u0628\u0645\u0648\u0639\u062F\u0643"), "\u0645\u0631\u062D\u0628\u0627\u064B \u0633\u0627\u0631\u0629\u060C", /*#__PURE__*/React.createElement("br", null), "\u0646\u0630\u0643\u0631\u0643 \u0628\u0623\u0646 \u0644\u062F\u064A\u0643 \u0645\u0648\u0639\u062F\u0627\u064B \u063A\u062F\u0627\u064B:", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("b", null, "\u0627\u0644\u062E\u062F\u0645\u0629:"), " \u0627\u0633\u062A\u0634\u0627\u0631\u0629", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("b", null, "\u0627\u0644\u0637\u0628\u064A\u0628:"), " \u0627\u0644\u062F\u0643\u062A\u0648\u0631 \u0623\u062D\u0645\u062F", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("b", null, "\u0627\u0644\u062A\u0627\u0631\u064A\u062E:"), " 10 \u0623\u063A\u0633\u0637\u0633 \xB7 ", /*#__PURE__*/React.createElement("b", null, "\u0627\u0644\u0648\u0642\u062A:"), " 5:00 \u0645", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("b", null, "\u0627\u0644\u0641\u0631\u0639:"), " \u0641\u0631\u0639 \u0623\u0643\u062A\u0648\u0628\u0631", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)'
    }
  }, "\u0646\u062A\u0645\u0646\u0649 \u0644\u0643 \u0627\u0644\u0633\u0644\u0627\u0645\u0629."))), /*#__PURE__*/React.createElement(Card, {
    padding: 0
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '18px 20px 12px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "history",
    size: 20,
    color: "var(--brand)"
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 'var(--text-lg)',
      color: 'var(--text-strong)'
    }
  }, "\u062D\u0627\u0644\u0627\u062A \u0627\u0644\u062A\u0630\u0643\u064A\u0631")), log.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr auto auto',
      gap: 12,
      alignItems: 'center',
      padding: '13px 20px',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      color: 'var(--text-strong)',
      fontSize: 'var(--text-sm)'
    }
  }, l.customer), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)'
    }
  }, l.when)), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, l.channel), /*#__PURE__*/React.createElement(StatusPill, {
    status: l.status
  }))))));
}
window.ReminderSettings = ReminderSettings;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/ReminderSettings.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/data.js
try { (() => {
// Mock data for the Meaad admin UI kit
window.MeaadData = {
  branches: ['فرع أكتوبر', 'فرع المعادي', 'فرع مدينة نصر'],
  services: ['استشارة', 'متابعة', 'تنظيف أسنان', 'أشعة'],
  doctors: [{
    name: 'الدكتور أحمد سمير',
    spec: 'أسنان',
    branch: 'فرع أكتوبر',
    phone: '0100 123 4567',
    rating: '4.9',
    patients: 312,
    days: 'السبت – الأربعاء',
    hours: '4 – 10 م',
    services: ['استشارة', 'تنظيف أسنان', 'أشعة'],
    active: true
  }, {
    name: 'الدكتورة منى خالد',
    spec: 'جلدية',
    branch: 'فرع المعادي',
    phone: '0111 555 8899',
    rating: '4.8',
    patients: 208,
    days: 'الأحد – الخميس',
    hours: '11 ص – 5 م',
    services: ['استشارة', 'متابعة'],
    active: true
  }, {
    name: 'الدكتور يوسف حسن',
    spec: 'باطنة',
    branch: 'فرع مدينة نصر',
    phone: '0122 777 3344',
    rating: '4.7',
    patients: 174,
    days: 'السبت – الثلاثاء',
    hours: '5 – 11 م',
    services: ['استشارة', 'متابعة'],
    active: false
  }, {
    name: 'الدكتورة سلمى ناصر',
    spec: 'أطفال',
    branch: 'فرع أكتوبر',
    phone: '0155 909 1010',
    rating: '5.0',
    patients: 96,
    days: 'الإثنين – الجمعة',
    hours: '10 ص – 3 م',
    services: ['استشارة'],
    active: true
  }],
  appointments: [{
    id: 1,
    customer: 'سارة عبدالله',
    phone: '0100 123 4567',
    service: 'استشارة',
    doctor: 'الدكتور أحمد سمير',
    branch: 'فرع أكتوبر',
    date: '10 أغسطس',
    time: '5:00 م',
    status: 'confirmed'
  }, {
    id: 2,
    customer: 'محمد عادل',
    phone: '0111 555 8899',
    service: 'تنظيف أسنان',
    doctor: 'الدكتور أحمد سمير',
    branch: 'فرع أكتوبر',
    date: '10 أغسطس',
    time: '5:30 م',
    status: 'pending'
  }, {
    id: 3,
    customer: 'ليلى فؤاد',
    phone: '0122 777 3344',
    service: 'جلدية',
    doctor: 'الدكتورة منى خالد',
    branch: 'فرع المعادي',
    date: '10 أغسطس',
    time: '6:00 م',
    status: 'confirmed'
  }, {
    id: 4,
    customer: 'كريم وليد',
    phone: '0100 909 1212',
    service: 'متابعة',
    doctor: 'الدكتور يوسف حسن',
    branch: 'فرع مدينة نصر',
    date: '11 أغسطس',
    time: '11:00 ص',
    status: 'cancelled'
  }, {
    id: 5,
    customer: 'نورهان سعيد',
    phone: '0155 432 1098',
    service: 'أشعة',
    doctor: 'الدكتور أحمد سمير',
    branch: 'فرع أكتوبر',
    date: '11 أغسطس',
    time: '1:00 م',
    status: 'confirmed'
  }],
  reminders: [{
    id: 'r1',
    title: 'التذكير الأول',
    timing: 'قبل 24 ساعة من الموعد',
    on: true
  }, {
    id: 'r2',
    title: 'التذكير الثاني',
    timing: 'قبل ساعة واحدة من الموعد',
    on: false
  }],
  channels: [{
    id: 'sms',
    label: 'SMS',
    icon: 'message-square',
    on: true
  }, {
    id: 'wa',
    label: 'WhatsApp',
    icon: 'message-circle',
    on: true
  }, {
    id: 'email',
    label: 'Email',
    icon: 'mail',
    on: false
  }],
  invoices: [{
    id: 'INV-2041',
    customer: 'سارة عبدالله',
    service: 'استشارة',
    doctor: 'الدكتور أحمد سمير',
    date: '10 أغسطس',
    method: 'بطاقة',
    amount: 450,
    status: 'paid'
  }, {
    id: 'INV-2042',
    customer: 'محمد عادل',
    service: 'تنظيف أسنان',
    doctor: 'الدكتور أحمد سمير',
    date: '10 أغسطس',
    method: 'نقدي',
    amount: 600,
    status: 'pending'
  }, {
    id: 'INV-2043',
    customer: 'ليلى فؤاد',
    service: 'استشارة جلدية',
    doctor: 'الدكتورة منى خالد',
    date: '10 أغسطس',
    method: 'محفظة',
    amount: 500,
    status: 'paid'
  }, {
    id: 'INV-2044',
    customer: 'كريم وليد',
    service: 'متابعة',
    doctor: 'الدكتور يوسف حسن',
    date: '11 أغسطس',
    method: 'بطاقة',
    amount: 300,
    status: 'refunded'
  }, {
    id: 'INV-2045',
    customer: 'نورهان سعيد',
    service: 'أشعة',
    doctor: 'الدكتور أحمد سمير',
    date: '11 أغسطس',
    method: 'نقدي',
    amount: 350,
    status: 'paid'
  }, {
    id: 'INV-2046',
    customer: 'عمر طارق',
    service: 'استشارة أطفال',
    doctor: 'الدكتورة سلمى ناصر',
    date: '11 أغسطس',
    method: 'بطاقة',
    amount: 400,
    status: 'pending'
  }],
  revenueByService: [{
    name: 'استشارة',
    value: 42
  }, {
    name: 'تنظيف أسنان',
    value: 28
  }, {
    name: 'أشعة',
    value: 18
  }, {
    name: 'متابعة',
    value: 12
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/data.js", error: String((e && e.message) || e) }); }

// ui_kits/customer/BookingWizard.jsx
try { (() => {
// Customer booking wizard — the PRD customer flow
const {
  Card,
  Button,
  Badge,
  Avatar,
  Icon,
  StatusPill
} = window.MeaadDesignSystem_54b82a;
const C = window.MeaadCustomer;
const STEPS = ['الفرع', 'الخدمة', 'الطبيب', 'التاريخ', 'الوقت', 'التأكيد'];
function Stepper({
  step
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 24
    }
  }, STEPS.map((s, i) => {
    const done = i < step,
      cur = i === step;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: s
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        flex: '0 0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 30,
        height: 30,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 13,
        transition: 'all .2s',
        background: done ? 'var(--brand)' : cur ? 'var(--white)' : 'var(--surface-sunken)',
        color: done ? '#fff' : cur ? 'var(--brand)' : 'var(--text-muted)',
        border: cur ? '2px solid var(--brand)' : '2px solid transparent',
        boxShadow: cur ? 'var(--shadow-focus)' : 'none'
      }
    }, done ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 15,
      stroke: 3
    }) : i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: cur ? 'var(--teal-700)' : 'var(--text-muted)',
        fontWeight: cur ? 700 : 400,
        fontFamily: 'var(--font-display)'
      }
    }, s)), i < STEPS.length - 1 && /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 2,
        background: i < step ? 'var(--brand)' : 'var(--border-default)',
        marginBottom: 16,
        borderRadius: 2
      }
    }));
  }));
}
function Choice({
  selected,
  onClick,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      textAlign: 'start',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      cursor: 'pointer',
      background: 'var(--white)',
      borderRadius: 'var(--radius-lg)',
      transition: 'all .15s',
      border: selected ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)',
      boxShadow: selected ? 'var(--shadow-focus)' : 'var(--shadow-xs)',
      ...style
    }
  }, children, /*#__PURE__*/React.createElement("div", {
    style: {
      marginInlineStart: 'auto',
      width: 22,
      height: 22,
      borderRadius: '50%',
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: selected ? 'none' : '2px solid var(--border-default)',
      background: selected ? 'var(--brand)' : 'transparent'
    }
  }, selected && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14,
    color: "#fff",
    stroke: 3
  })));
}
function Ring({
  icon,
  tone = 'var(--brand)'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 'var(--radius-md)',
      flex: '0 0 auto',
      background: `color-mix(in srgb, ${tone} 12%, white)`,
      color: tone,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 22
  }));
}
function BookingWizard() {
  const [step, setStep] = React.useState(0);
  const [sel, setSel] = React.useState({});
  const set = (k, v) => setSel(s => ({
    ...s,
    [k]: v
  }));
  const next = () => setStep(s => Math.min(s + 1, STEPS.length));
  const back = () => setStep(s => Math.max(s - 1, 0));
  const canNext = [sel.branch, sel.service, sel.doctor, sel.date, sel.time][step] != null;
  if (step === STEPS.length) return /*#__PURE__*/React.createElement(Confirmed, {
    sel: sel,
    onReset: () => {
      setSel({});
      setStep(0);
    }
  });
  return /*#__PURE__*/React.createElement(Card, {
    padding: 26,
    style: {
      width: 560,
      maxWidth: '100%'
    }
  }, /*#__PURE__*/React.createElement(Stepper, {
    step: step
  }), step === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(StepTitle, {
    icon: "map-pin"
  }, "\u0627\u062E\u062A\u0631 \u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0623\u0642\u0631\u0628 \u0625\u0644\u064A\u0643"), C.branches.map(b => /*#__PURE__*/React.createElement(Choice, {
    key: b.name,
    selected: sel.branch === b.name,
    onClick: () => set('branch', b.name)
  }, /*#__PURE__*/React.createElement(Ring, {
    icon: "map-pin"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, b.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, b.addr, " \xB7 ", b.hours))))), step === 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement(StepTitle, {
    icon: "clipboard-list"
  }, "\u0645\u0627 \u0627\u0644\u062E\u062F\u0645\u0629 \u0627\u0644\u062A\u064A \u062A\u062D\u062A\u0627\u062C\u0647\u0627\u061F")), C.services.map(s => /*#__PURE__*/React.createElement(Choice, {
    key: s.name,
    selected: sel.service === s.name,
    onClick: () => set('service', s.name),
    style: {
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Ring, {
    icon: s.icon,
    tone: "var(--amber-600)"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)'
    }
  }, s.dur))))), step === 2 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(StepTitle, {
    icon: "stethoscope"
  }, "\u0627\u062E\u062A\u0631 \u0627\u0644\u0637\u0628\u064A\u0628"), C.doctors.map(dc => /*#__PURE__*/React.createElement(Choice, {
    key: dc.name,
    selected: sel.doctor === dc.name,
    onClick: () => set('doctor', dc.name)
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: dc.name
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, dc.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, dc.spec, /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    size: 13,
    color: "var(--amber-500)"
  }), dc.rating))))), step === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepTitle, {
    icon: "calendar"
  }, "\u0627\u062E\u062A\u0631 \u0627\u0644\u062A\u0627\u0631\u064A\u062E"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 10
    }
  }, C.dates.map(d => {
    const on = sel.date === `${d.d} ${d.mo}`;
    return /*#__PURE__*/React.createElement("button", {
      key: d.d,
      onClick: () => set('date', `${d.d} ${d.mo}`),
      style: {
        cursor: 'pointer',
        padding: '16px 8px',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        transition: 'all .15s',
        background: on ? 'var(--brand)' : 'var(--white)',
        border: on ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)',
        color: on ? '#fff' : 'var(--text-body)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-xs)',
        opacity: .85
      }
    }, d.day), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: 'var(--text-xl)'
      }
    }, d.d), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-xs)',
        opacity: .85
      }
    }, d.mo));
  }))), step === 4 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepTitle, {
    icon: "clock"
  }, "\u0627\u062E\u062A\u0631 \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0627\u062D"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 10
    }
  }, C.times.map((t, i) => {
    const on = sel.time === t;
    const dis = i === 2;
    return /*#__PURE__*/React.createElement("button", {
      key: t,
      disabled: dis,
      onClick: () => set('time', t),
      style: {
        cursor: dis ? 'not-allowed' : 'pointer',
        padding: '12px 8px',
        borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 'var(--text-sm)',
        transition: 'all .15s',
        opacity: dis ? .4 : 1,
        textDecoration: dis ? 'line-through' : 'none',
        background: on ? 'var(--brand)' : 'var(--white)',
        border: on ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)',
        color: on ? '#fff' : 'var(--text-body)'
      }
    }, t);
  }))), step === 5 && /*#__PURE__*/React.createElement(Summary, {
    sel: sel
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 24
    }
  }, step > 0 && /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    iconStart: "chevron-right",
    onClick: back
  }, "\u0627\u0644\u0633\u0627\u0628\u0642"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), step < 5 && /*#__PURE__*/React.createElement(Button, {
    iconEnd: "chevron-left",
    disabled: !canNext,
    onClick: next
  }, "\u0627\u0644\u062A\u0627\u0644\u064A"), step === 5 && /*#__PURE__*/React.createElement(Button, {
    iconStart: "check",
    onClick: next
  }, "\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062D\u062C\u0632")));
}
function StepTitle({
  icon,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 20,
    color: "var(--brand)"
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 'var(--text-lg)',
      color: 'var(--text-strong)'
    }
  }, children));
}
function SummaryRow({
  icon,
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 0',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 18,
    color: "var(--text-muted)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      fontSize: 'var(--text-sm)',
      width: 70
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      color: 'var(--text-strong)',
      marginInlineStart: 'auto'
    }
  }, value));
}
function Summary({
  sel
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepTitle, {
    icon: "clipboard-check"
  }, "\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062D\u062C\u0632"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-lg)',
      padding: '4px 18px'
    }
  }, /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "map-pin",
    label: "\u0627\u0644\u0641\u0631\u0639",
    value: sel.branch
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "clipboard-list",
    label: "\u0627\u0644\u062E\u062F\u0645\u0629",
    value: sel.service
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "stethoscope",
    label: "\u0627\u0644\u0637\u0628\u064A\u0628",
    value: sel.doctor
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "calendar",
    label: "\u0627\u0644\u062A\u0627\u0631\u064A\u062E",
    value: sel.date
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "clock",
    label: "\u0627\u0644\u0648\u0642\u062A",
    value: sel.time
  })));
}
function Confirmed({
  sel,
  onReset
}) {
  return /*#__PURE__*/React.createElement(Card, {
    padding: 32,
    style: {
      width: 520,
      maxWidth: '100%',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 76,
      height: 76,
      borderRadius: '50%',
      background: 'var(--success-subtle)',
      color: 'var(--green-500)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 18px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 40,
    stroke: 2.5
  })), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 6px',
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      fontSize: 'var(--text-2xl)',
      color: 'var(--text-strong)'
    }
  }, "\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u0645\u0648\u0639\u062F\u0643"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 22px',
      color: 'var(--text-muted)'
    }
  }, "\u0633\u064A\u0635\u0644\u0643 \u062A\u0630\u0643\u064A\u0631 \u0642\u0628\u0644 \u0627\u0644\u0645\u0648\u0639\u062F \u0628\u0640 24 \u0633\u0627\u0639\u0629 \u0648\u0642\u0628\u0644 \u0633\u0627\u0639\u0629 \u0648\u0627\u062D\u062F\u0629."), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'start',
      background: 'var(--brand-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '6px 18px',
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "stethoscope",
    label: "\u0627\u0644\u0637\u0628\u064A\u0628",
    value: sel.doctor
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "calendar",
    label: "\u0627\u0644\u062A\u0627\u0631\u064A\u062E",
    value: sel.date
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "clock",
    label: "\u0627\u0644\u0648\u0642\u062A",
    value: sel.time
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "map-pin",
    label: "\u0627\u0644\u0641\u0631\u0639",
    value: sel.branch
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: "confirmed"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      fontSize: 'var(--text-sm)'
    }
  }, "\u0633\u064A\u0635\u0644\u0643 \u0625\u0634\u0639\u0627\u0631 \u0639\u0628\u0631 WhatsApp")), /*#__PURE__*/React.createElement(Button, {
    block: true,
    variant: "secondary",
    iconStart: "calendar-plus",
    onClick: onReset
  }, "\u062D\u062C\u0632 \u0645\u0648\u0639\u062F \u0622\u062E\u0631"));
}
window.BookingWizard = BookingWizard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/customer/BookingWizard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/customer/data.js
try { (() => {
window.MeaadCustomer = {
  branches: [{
    name: 'فرع أكتوبر',
    addr: '٦ أكتوبر · المحور المركزي',
    hours: '10 ص – 10 م'
  }, {
    name: 'فرع المعادي',
    addr: 'المعادي · شارع ٩',
    hours: '11 ص – 9 م'
  }, {
    name: 'فرع مدينة نصر',
    addr: 'مدينة نصر · عباس العقاد',
    hours: '10 ص – 11 م'
  }],
  services: [{
    name: 'استشارة',
    dur: '30 دقيقة',
    icon: 'clipboard-list'
  }, {
    name: 'متابعة',
    dur: '20 دقيقة',
    icon: 'repeat'
  }, {
    name: 'تنظيف أسنان',
    dur: '45 دقيقة',
    icon: 'sparkles'
  }, {
    name: 'أشعة',
    dur: '15 دقيقة',
    icon: 'scan-line'
  }],
  doctors: [{
    name: 'الدكتور أحمد سمير',
    spec: 'أسنان',
    rating: '4.9'
  }, {
    name: 'الدكتورة منى خالد',
    spec: 'جلدية',
    rating: '4.8'
  }, {
    name: 'الدكتور يوسف حسن',
    spec: 'باطنة',
    rating: '4.7'
  }],
  dates: [{
    day: 'السبت',
    d: '9',
    mo: 'أغسطس'
  }, {
    day: 'الأحد',
    d: '10',
    mo: 'أغسطس'
  }, {
    day: 'الإثنين',
    d: '11',
    mo: 'أغسطس'
  }, {
    day: 'الثلاثاء',
    d: '12',
    mo: 'أغسطس'
  }],
  times: ['4:00 م', '4:30 م', '5:00 م', '5:30 م', '6:00 م', '6:30 م', '7:00 م', '7:30 م']
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/customer/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.SidebarItem = __ds_scope.SidebarItem;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
