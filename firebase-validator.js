/* ============================================================
   Firebase Configuration Validator & Diagnostics
   تشخيص تلقائي لمشاكل الإعداد
   ============================================================ */

(function () {
  'use strict';

  const FirebaseValidator = {
    /**
     * Check if Firebase is properly initialized
     */
    validateFirebaseSetup: function() {
      console.log('🔍 Validating Firebase setup...');
      
      const config = window.FIREBASE_CONFIG || {};
      const issues = [];

      // Check required fields
      if (!config.apiKey || config.apiKey.startsWith('YOUR_')) {
        issues.push('❌ apiKey is missing or placeholder');
      }
      if (!config.projectId) {
        issues.push('❌ projectId is missing');
      }
      if (!config.authDomain) {
        issues.push('❌ authDomain is missing');
      }

      if (issues.length > 0) {
        console.error('🚨 Firebase Configuration Issues:', issues);
        return { valid: false, issues };
      }

      // Check if Firebase app is initialized
      if (!firebase.apps.length) {
        console.warn('⚠️ Firebase app not initialized yet');
        return { valid: false, issues: ['Firebase app not initialized'] };
      }

      console.log('✅ Firebase setup is valid');
      return { valid: true, issues: [] };
    },

    /**
     * Check if Email/Password auth is enabled
     */
    checkEmailAuthEnabled: async function() {
      try {
        // Try to create a test user sign-in method
        const auth = firebase.auth();
        
        // This will throw an error if email/password auth is not enabled
        await auth.signInWithEmailAndPassword('test@example.com', 'test');
      } catch (error) {
        const code = error.code || '';
        
        if (code === 'auth/operation-not-allowed') {
          console.error('❌ EMAIL/PASSWORD AUTH IS NOT ENABLED IN FIREBASE CONSOLE');
          console.log('📌 Solution: Go to Firebase Console → Authentication → Sign-in method → Enable Email/Password');
          return { enabled: false, reason: 'auth/operation-not-allowed' };
        }
        
        if (code === 'auth/invalid-email' || code === 'auth/wrong-password') {
          console.log('✅ Email/Password auth IS enabled (got auth error, not operation error)');
          return { enabled: true, reason: 'auth response received' };
        }
      }
      
      return { enabled: false, reason: 'unknown' };
    },

    /**
     * Diagnostic report
     */
    generateDiagnosticsReport: async function() {
      console.log('📊 Generating diagnostics report...');
      
      const report = {
        timestamp: new Date().toISOString(),
        firebaseSetup: this.validateFirebaseSetup(),
        emailAuthEnabled: await this.checkEmailAuthEnabled(),
        environment: {
          isDevelopment: !window.location.hostname.includes('tigerautoparts'),
          isLocalhost: window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'),
          currentUrl: window.location.href
        }
      };

      console.log('📋 DIAGNOSTICS REPORT:', report);
      return report;
    }
  };

  // Export to window
  window.FirebaseValidator = FirebaseValidator;

  // Auto-run diagnostics on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      FirebaseValidator.generateDiagnosticsReport();
    });
  } else {
    FirebaseValidator.generateDiagnosticsReport();
  }
})();
