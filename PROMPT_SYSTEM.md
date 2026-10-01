# PROMPT_SYSTEM.md: MyKhairat (Sistem Dana Kita)

## 1. System Overview & Requirements

**System Identity**
*   **System Name:** MyKhairat
*   **Tagline:** Sistem Dana Kita
*   **Concept:** A modernized, accessible, and community-driven digital platform for managing the Khairat Kematian fund.

**Problem Statement**
The current Khairat Kematian program relies on a manual Google Sheets database and decentralized Google Drive folders for payment receipts. This manual workflow introduces operational bottlenecks, data integrity risks in calculating variable monthly rates (Kadar RM), and a lack of self-service access for Family Representatives (Wakil).

**Objectives**
*   Digitize and automate the manual spreadsheet process into a centralized digital management system using the Google Workspace ecosystem.
*   Streamline payment verification by linking payment entries and corresponding proof of payment ("Bukti Pembayaran") on a single screen.
*   Provide a portal for Wakil to submit payments and view their family's active status and required payment rates.
*   Enforce strict business rules regarding member status, payment deadlines, and claim eligibility.

**Minimum Viable Product (MVP)**
*   A normalized backend database separating Families, Members, and Payments.
*   An Admin Dashboard (AppSheet) for viewing and approving pending payments.
*   A Payment Submission Form for Wakil to select their Family ID, payment month, and upload receipt images directly.
*   Automated calculation of required monthly payments based on the current active member count for each family.

**Business Rules**
*   The monthly contribution is strictly tied to the number of Active members in a family.
*   A payment log is only considered Complete when an Admin verifies the transaction reference and receipt.
*   If unpaid for 3 consecutive months, the family status changes to Suspended, rendering members ineligible for death benefits.
*   Only members explicitly listed as "Aktif" in the Family_Members table are eligible for Khairat Kematian payouts.

**PCR (Painful, Comfortable, Revamp) Framework**
*   **Painful (Current State):** Manual cross-checking of WhatsApp receipts, manual updates to active member counts, and line-by-line scanning to track arrears.
*   **Comfortable (MVP):** Unified AppSheet interface merging the database and Drive receipts, streamlined uploads via forms, and automated generation of expected vs. actual collections.
*   **Revamp (Future):** Automated WhatsApp/email reminders, direct payment gateway integration (FPX/ToyyibPay), and a dedicated self-service member portal.

## 2. Database & Architecture

**System Architecture**
*   **Frontend:** Google AppSheet (Mobile/Web app) with role-based access.
*   **Backend:** Google Sheets.
*   **Storage:** Google Drive API for direct image uploads to the "Bukti Pembayaran" folder.
*   **Automation:** Google Apps Script / AppSheet Bots for notifications and status changes.

**Data Requirements (Entity Schema)**
1.  **SETTINGS:** Base_Rate_Per_Member, Payment_Due_Day, Payment_Method.
2.  **FAMILIES:** Family_ID (Primary Key), Wakil_Name, Wakil_Phone, Family_Status.
3.  **MEMBERS:** Member_ID (Primary Key), Family_ID (Foreign Key), Member_Name, Member_Status.
4.  **PAYMENTS:** Payment_ID (Primary Key), Family_ID (Foreign Key), Payment_Date, Payment_Month_Year, Amount_Paid, Receipt_Image_URL, Approval_Status.

## 3. User Journeys & Workflows

**Users & Roles**
*   **System Admin (AJK):** Full access to approve payments, manage master data, and view financial reports.
*   **Wakil (Family Rep):** Restricted access to view their specific Family ID, submit payments, and track personal ledgers.
*   **Ahli (Dependents):** No system access; managed by the Admin based on the Wakil's reports.

**System Workflow: Monthly Payment Processing**
1.  **Initiation:** Wakil opens the payment form.
2.  **Submission:** Wakil inputs the transaction reference and uploads the QR payment screenshot.
3.  **Storage:** System saves the image and records a "Pending" entry in the Payments database ("Log Masuk Duit").
4.  **Verification:** Admin views the submitted details side-by-side with the uploaded receipt on the AppSheet dashboard and approves the transaction.
5.  **Confirmation:** System updates status to "Approved" and recalculates the current balance ("Baki awal").

## 4. UI/UX Wireframe Prompts

**Wakil Pages (Family Representative View)**
*   **Login Page:** UI/UX wireframe design of a mobile app login screen. Title "MyKhairat". Clean, modern. Prominent "Sign in with Google" button, standard email/password fields, and a "Log In" button. Light grey and white palette --ar 9:16 --v 6.0
*   **Family Profile (Landing Page):** UI/UX wireframe design of a mobile app dashboard. Top section shows "Family ID: K001". Middle section displays "Total Active Members: 4" and "Monthly Dues: RM 20". Bottom section has buttons for "Submit Payment" and "View Dependents" --ar 9:16 --v 6.0
*   **My Dependents:** UI/UX wireframe design of a mobile app directory list. Title "Family Members". Each row has a user icon, name, and status tag. A floating action button (+) to request adding a new member --ar 9:16 --v 6.0
*   **Submit Payment Form:** UI/UX wireframe design of a mobile app form for digital payment receipt. Includes "Select Month" dropdown, "Amount" text input, and a dashed-border box for "Upload Receipt Image". Large "Submit" button --ar 9:16 --v 6.0
*   **Payment Ledger:** UI/UX wireframe design of a transaction history screen. A vertical list of cards showing payment month, date, amount paid, and status pill (Pending, Approved, Rejected) --ar 9:16 --v 6.0
*   **Family Statement:** UI/UX wireframe design of a mobile app printable statement screen. Title "Family Statement". Data grid showing 12 rows for months with status checkmarks. "Download as PDF" action button --ar 9:16 --v 6.0

**Admin Pages (AJK / Committee View)**
*   **Pending Approvals:** UI/UX wireframe design of a mobile app admin verification screen. Top half shows receipt image preview. Bottom half displays text details. Large "Approve" and "Reject" buttons --ar 9:16 --v 6.0
*   **Master Directory:** UI/UX wireframe design of a mobile app master database screen. Search bar and list of families showing ID, Representative Name, and Total Members --ar 9:16 --v 6.0
*   **Master Financial Report:** UI/UX wireframe design of an annual financial report screen. Shows "Total Fund Balance", a monthly collection bar chart, and a collapsible data table. "Download PDF" button --ar 9:16 --v 6.0
*   **Arrears Report:** UI/UX wireframe design of a mobile app admin report screen. Alert box: "15 Families Overdue". Vertical list of user cards showing overdue months and amount due, with "Phone" and "Message" icons for follow-up --ar 9:16 --v 6.0
*   **Settings:** UI/UX wireframe design of a settings screen. Input fields for "Base Rate per Member", "Payment Due Date", and "Bank Account Number". "Save Changes" button --ar 9:16 --v 6.0

## 5. Branding & Logo Prompts

**MyKhairat Logo AI Prompt**
> A minimalist, modern, and compassionate logo for "MyKhairat", a digitized community Khairat Kematian system[cite: 1]. The design is a sophisticated, abstract graphic combining elements of unity, care, and digital connectivity[cite: 1]. It features a central, fluid, continuous-line symbol that interlocks two abstract, stylized figures or hearts, forming a stable, protective circle or blossom[cite: 1]. The overall shape subtly integrates the letters 'M' and 'K' in a fluid, connected motion[cite: 1]. Within the upper portion, a modernized crescent and a glowing five-pointed star (symbolizing guidance, faith, and support) emerge gracefully, integrated into the lines[cite: 1]. The logo conveys warmth, trust, community support, and digital innovation[cite: 1]. The line work is clean, smooth, and balanced[cite: 1]. Below the icon, the name "MyKhairat" is rendered in a modern, clean, sans-serif font[cite: 1]. "My" is in a soothing blue (#007BFF), and "Khairat" is in a warm, compassionate green (#28A745), emphasizing the connection[cite: 1]. A subtle tagline, "Sistem Dana Kita" (Our Fund System), is in a smaller, lighter grey font below the main name[cite: 1]. The logo uses a palette of fresh blue and natural green, symbolizing trust and harmony, on a clean white background[cite: 1]. The composition is centered, balanced, and professional, appearing as a high-fidelity vector graphic with soft gradient transitions in the icon[cite: 1]. The background is subtle and bright, surrounded by a faint hexagonal pattern[cite: 1].