# Design Guidelines: Plataforma de Enfermagem 11Care

## Design Approach
**Reference-Based Healthcare Design** - Drawing from established medical software platforms with emphasis on clarity, accessibility, and professional aesthetics. The design follows the official 11Care brand identity with a focus on utility and trust.

## Core Design Principles

### Color System (Official 11Care Palette)
- **Primary Blue**: `#0056b3` - Main brand color for headers, primary actions
- **Secondary Blue**: `#007bff` - Accent and gradients
- **Light Blue**: `#e8f4ff` - Backgrounds and highlights
- **Accent Green**: `#28a745` - Success states, active status
- **Accent Orange**: `#fd7e14` - Warnings, coming soon
- **Accent Red**: `#dc3545` - Alerts, critical items
- **Neutrals**: White `#ffffff`, Light `#f8f9fa`, Gray `#6c757d`, Dark `#343a40`

### Typography Hierarchy
- **Font Family**: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif (system fonts for healthcare readability)
- **Headings**: 
  - H1: 32px bold (login), 24px bold (page headers) in Primary Blue
  - H2: 22px bold for module/card titles
  - H3: 18-20px for section headers
- **Body Text**: 14-16px, line-height 1.6 for optimal readability
- **Small Text**: 12-14px for labels, badges, metadata

### Layout System
**Spacing Units**: Consistent 4px-based scale
- Micro: 4px, 8px (gaps, padding)
- Small: 12px, 16px (component spacing)
- Medium: 20px, 24px, 28px (card padding, section gaps)
- Large: 30px, 40px (page margins)

**Container Strategy**:
- Max-width container with 20px horizontal padding
- Full-width headers with inner containers
- Grid layouts: `minmax(380px, 1fr)` for module cards

## Component Library

### Buttons
- **Gradient Style**: All primary buttons use linear gradients (135deg)
- **Primary**: Blue gradient with shadow, white text
- **Secondary**: White background, blue border and text
- **Success**: Green gradient
- **Warning**: Orange gradient
- Padding: 10px 16px, border-radius: 8px, font-weight: 600
- Icons integrated with 8px gap
- Hover: Lift effect (translateY -2px) with enhanced shadow

### Cards
- **Base Card**: White background, 12px border-radius, subtle shadow
- **Gradient Card**: Light blue to white gradient with 4px left border (Primary Blue)
- **Module Cards**: 16px radius, 28px padding, 4px colored top border
- Hover: Lift -6px with larger shadow
- 2px border (transparent or themed color)

### Badges & Status Indicators
- Border-radius: 20px (pill shape)
- Padding: 6px 12px
- Font: 12px, weight 600
- Gradient backgrounds matching color system
- Status types: Active (green), Coming Soon (orange), Alert (red), Info (blue)

### Forms
- **Input Fields**: 14px padding, 2px border, 8px radius
- Border color: Light gray default, Primary Blue on focus
- Focus state: Blue border + subtle blue shadow (3px spread)
- Label: 14px semi-bold, 8px margin-bottom
- Background: White

### Navigation & Header
- **Header Height**: Compact, ~60-70px
- **Logo**: Max-width 280px (login), 45px height (app header)
- Top border: 3px Primary Blue accent line
- White background with shadow
- Flex layout: Logo left, user info/actions right

## Page-Specific Layouts

### Login Page
- Full viewport height centered layout
- Background: Hero image with 10% blue overlay (rgba(0, 86, 179, 0.1))
- Centered card: max-width 420px
- Logo → Title → Form → Footer (vertical flow)
- Large, welcoming typography

### Module Dashboard
- Grid of module cards (auto-fill, minmax 380px)
- 28px gap between cards
- Each card: Icon/title → Description → Feature list (checkmarks) → CTA button
- Visual hierarchy: Primary modules with gradient background, secondary modules muted

### Shift Handover Interface
- **Header**: Sticky top navigation with menu toggle, logo, search, notifications
- **Sidebar**: Collapsible menu (modules, settings)
- **Main Content**: Filter bar → Data grid/cards → Action buttons
- **Forms**: Multi-section with tabs/steps for patient data, vitals, medications, observations
- Information density: Balanced with adequate whitespace for clinical accuracy

## Interactive Elements

### Icons
- **Library**: Font Awesome 6.4.0 (already specified)
- Size: 18-24px for buttons, 12-14px for inline text
- Color: Inherit or theme-specific

### Animations
- **Minimal**: Only hover states and transitions
- Transitions: 0.3s ease for all interactive elements
- No distracting motion - healthcare context requires focus

## Images
**Hero Image**: Login page uses healthcare professional image from 11Care website
- URL: `https://11care.com.br/wp-content/uploads/2025/10/Artigo-Profissionalizacao-da-enfermagem.jpg.webp`
- Treatment: Subtle blue overlay for brand consistency
- Placement: Full viewport background, center/cover

**No additional images needed** - Interface is icon and data-driven for clarity and performance

## Accessibility & Best Practices
- High contrast text (WCAG AA minimum)
- Focus states clearly visible
- Touch-friendly targets (minimum 44px)
- Semantic HTML structure
- Form labels always visible
- Status conveyed with color + text/icons

## Responsive Behavior
- Mobile-first approach
- Grid collapses to single column on mobile
- Navigation becomes hamburger menu
- Forms stack vertically
- Reduced padding/margins on small screens (12-16px)