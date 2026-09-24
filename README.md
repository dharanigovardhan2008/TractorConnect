# Tractor Connect - Smart Farm Management System

[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12.13.0-orange)](https://firebase.google.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.3.4-blue)](https://capacitorjs.com/)
[![PWA](https://img.shields.io/badge/PWA-ready-green)](https://web.dev/progressive-web-apps/)

Tractor Connect is a comprehensive farm management platform that helps agricultural businesses manage tractors, drivers, customers, services, and financial operations through a modern web and mobile application.

## 🚀 Features

### Core Management Modules
- **Tractor Management** - Track tractor inventory, assignments, and maintenance
- **Driver Management** - Manage driver profiles, salaries, and payments
- **Customer Management** - Track customer information and loyalty levels
- **Service Management** - Record and manage agricultural services
- **Financial Tracking** - Monitor revenue, expenditures, and pending payments
- **Maintenance Logs** - Track tractor maintenance history and costs

### Technical Features
- **Progressive Web App (PWA)** - Installable on mobile devices
- **Cross-Platform** - Web app with Android mobile support via Capacitor
- **Real-time Data** - Live updates using Firebase Firestore
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Authentication** - Secure login with Firebase Auth
- **Dark/Light Mode** - Modern UI with theme support
- **Data Visualization** - Charts and analytics dashboard

## 📁 Project Structure

```
TractorConnect/
├── 📁 src/
│   ├── 📁 app/                    # Next.js 13+ App Router pages
│   │   ├── customers/            # Customer management page
│   │   ├── dashboard/            # Main dashboard with analytics
│   │   ├── drivers/              # Driver management page
│   │   ├── expenditure/          # Financial tracking page
│   │   ├── fields/               # Field/plot management page
│   │   ├── maintenance/          # Maintenance records page
│   │   ├── services/             # Service management page
│   │   ├── tractors/             # Tractor management page
│   │   ├── layout.tsx           # Root layout with auth provider
│   │   └── page.tsx             # Landing/auth page
│   ├── 📁 components/            # Reusable UI components
│   │   ├── AuthScreen.tsx       # Authentication UI
│   │   ├── CustomerCard.tsx     # Customer display card
│   │   ├── DashboardContent.tsx # Dashboard widgets
│   │   ├── DriverCard.tsx       # Driver display card
│   │   ├── MobileNav.tsx        # Mobile navigation
│   │   ├── Modal.tsx            # Reusable modal component
│   │   ├── QuickHistory.tsx     # Recent activity widget
│   │   ├── ServiceCard.tsx      # Service display card
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   ├── StatsCard.tsx        # Statistics display card
│   │   └── TractorCard.tsx      # Tractor display card
│   ├── 📁 lib/                   # Utility libraries
│   │   ├── 📁 context/          # React context providers
│   │   │   └── AuthContext.tsx # Authentication context
│   │   └── firebase.ts         # Firebase configuration
│   └── 📁 types/                # TypeScript type definitions
│       └── index.ts            # Application data interfaces
├── 📁 public/                   # Static assets
│   ├── manifest.json           # PWA manifest
│   ├── icon-192.png           # App icon (192x192)
│   ├── icon-512.png           # App icon (512x512)
│   └── *.svg                  # SVG icons for UI
├── 📁 android/                  # Android native app
│   └── 📁 app/
│       ├── src/main/           # Android native code
│       └── build.gradle        # Android build configuration
├── 📄 package.json             # Dependencies and scripts
├── 📄 capacitor.config.ts      # Capacitor mobile app config
├── 📄 firebase.json           # Firebase configuration
├── 📄 firestore.rules         # Firestore security rules
├── 📄 firestore.indexes.json  # Firestore database indexes
├── 📄 next.config.ts          # Next.js configuration
├── 📄 tsconfig.json           # TypeScript configuration
├── 📄 eslint.config.mjs       # ESLint configuration
├── 📄 postcss.config.mjs      # PostCSS configuration
├── 📄 .gitignore              # Git ignore rules
├── 📄 .firebaserc             # Firebase project config
└── 📄 README.md               # This file
```

## 🛠️ Technology Stack

### Frontend
- **Next.js 16.2.4** - React framework with App Router
- **React 19.2.4** - UI library
- **TypeScript 5.0** - Type safety
- **Tailwind CSS 4** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Headless UI** - Accessible UI components

### Backend & Services
- **Firebase Authentication** - User authentication
- **Firebase Firestore** - NoSQL database with real-time updates
- **Firebase Hosting** - Static hosting (optional)

### Mobile
- **Capacitor 8.3.4** - Cross-platform native runtime
- **Android** - Native Android app support

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Static type checking
- **PostCSS** - CSS processing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Firebase account (for authentication and database)
- Android Studio (for Android development, optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tractor-connect.git
   cd tractor-connect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication and Firestore
   - Copy your Firebase config to `src/lib/firebase.ts`

4. **Configure environment** (optional)
   Create `.env.local` file:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   ```

### Development

1. **Start development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

2. **Build for production**
   ```bash
   npm run build
   npm start
   ```

3. **Lint code**
   ```bash
   npm run lint
   ```

### Mobile Development

1. **Add Android platform**
   ```bash
   npx cap add android
   ```

2. **Build and sync**
   ```bash
   npm run build
   npx cap sync
   ```

3. **Open in Android Studio**
   ```bash
   npx cap open android
   ```

## 📱 Application Modules

### 1. Dashboard
- Real-time statistics and analytics
- Revenue tracking with charts
- Recent activities and notifications
- Quick access to all modules

### 2. Tractor Management
- Track tractor inventory
- Assign drivers to tractors
- Record purchase dates and details
- View maintenance history

### 3. Driver Management
- Driver profiles with contact information
- Salary tracking and payments
- Assignment history
- Performance metrics

### 4. Customer Management
- Customer profiles and contact details
- Loyalty program tracking
- Service history
- Payment status

### 5. Service Management
- Service catalog management
- Record service transactions
- Track area/time and pricing
- Payment status monitoring

### 6. Financial Management
- Revenue tracking
- Expenditure categorization
- Pending payments
- Financial reports

### 7. Maintenance Tracking
- Maintenance records
- Cost tracking
- Service history per tractor
- Preventive maintenance scheduling

## 🔐 Authentication & Security

- **Firebase Authentication** with email/password or Google Sign-In
- **Role-based access control** (planned)
- **Firestore Security Rules** for data protection
- **PWA security headers** and HTTPS enforcement

## 🎨 UI/UX Features

- **Responsive Design** - Works on all screen sizes
- **Dark/Light Themes** - System preference detection
- **Animations** - Smooth transitions with Framer Motion
- **Accessibility** - ARIA labels and keyboard navigation
- **Loading States** - Skeleton loaders and progress indicators
- **Error Handling** - User-friendly error messages

## 📊 Data Models

The application uses the following core data structures:

```typescript
// See src/types/index.ts for complete definitions
interface Tractor {
  id: string;
  name: string;
  boughtDate: string;
  assignedDriverId?: string;
  // ... more fields
}

interface ServiceRecord {
  id: string;
  customerId: string;
  driverId: string;
  tractorId: string;
  serviceId: string;
  amount: number;
  paidAmount: number;
  paymentStatus: "paid" | "partial" | "unpaid";
  // ... more fields
}
```

## 🚀 Deployment

### Web Deployment (Firebase Hosting)

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   firebase deploy --only hosting
   ```

### Android Deployment

1. **Generate Android build**
   ```bash
   npx cap build android
   ```

2. **Sign APK/AAB** and upload to Google Play Console

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | No |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | No |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Dharani** - Initial work - [GitHub](https://github.com/dharanigovardhan2008)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Firebase](https://firebase.google.com/) for backend services
- [Capacitor](https://capacitorjs.com/) for cross-platform mobile support
- [Tailwind CSS](https://tailwindcss.com/) for styling utilities

---

**Built with ❤️ for the agricultural community**

*Last updated: September 24, 2026*