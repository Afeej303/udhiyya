# QurbaniOS --- M2 Core Application Workflow & SaaS Structure

**Project:** Aḍḥiyah Management System\
**Scope:** M2 --- Core Features\
**Purpose:** Shared workflow and feature reference for the project team

------------------------------------------------------------------------

## 1. Project Overview

QurbaniOS is a SaaS (Software as a Service) platform for managing annual
Aḍḥiyah programmes for different Mahallus or organising committees.

The QurbaniOS platform owner provides the software to each committee.
Each committee manages its own annual programme, households,
participants, animals, volunteers, finance and distribution.

The application has these user experiences:

1.  Super Admin --- owns and manages the QurbaniOS platform.
2.  Public --- explores programme information.
3.  Participant --- manages personal Aḍḥiyah participation.
4.  Public Beneficiary --- tracks public distribution.
5.  Committee / Admin --- manages one organisation's programme.
6.  Volunteers --- perform assigned ground-level work.

The Public Beneficiary experience is part of the public-facing
application. All organisations use the same platform, but each
organisation's data must remain separate. Users only see information and
actions allowed for their role.

## 2. Super Admin Interface --- QurbaniOS Platform Owner

The Super Admin is the owner and operator of QurbaniOS itself.

QurbaniOS is designed as a universal SaaS platform. This means the same
application can be provided to many Mahallus, mosques or Aḍḥiyah
committees. Each organisation gets its own separate workspace.

**The Super Admin manages the platform. The Committee Admin manages
their own organisation and Aḍḥiyah programme.**

### Super Admin user journey

1.  The QurbaniOS owner logs in to the Super Admin portal.
2.  Opens the platform dashboard.
3.  Creates a new organisation (for example, a Mahallu or committee).
4.  Enters the organisation's basic details.
5.  Creates or invites the organisation's main Committee Admin.
6.  Sets the organisation's access status and enabled features.
7.  The Committee Admin receives access and completes organisation
    setup.
8.  The organisation starts managing its own annual Aḍḥiyah programme.
9.  The Super Admin can manage platform-level access, support and system
    settings.

### Super Admin dashboard

The dashboard gives the platform owner an overview of QurbaniOS as a
service. It is not the dashboard for an individual Aḍḥiyah programme.

It can show:

-   Total organisations using QurbaniOS.
-   Active and inactive organisations.
-   Organisations onboarding or awaiting setup.
-   Total committee admin accounts.
-   Platform announcements and service notices.
-   Recent platform activity.
-   Support requests requiring attention.

### Super Admin pages

  -----------------------------------------------------------------------
  ID                      Page                    Main contents
  ----------------------- ----------------------- -----------------------
  SA01                    Super Admin Dashboard   Overall platform
                                                  summary and recent
                                                  activity

  SA02                    Organisation Management Create, view, search,
                                                  edit and manage
                                                  organisations

  SA03                    Organisation Details    Organisation name,
                                                  locality, contact
                                                  details, status and
                                                  assigned admins

  SA04                    Admin & Access          Invite or create
                          Management              Committee Admin
                                                  accounts; reset access
                                                  and manage roles

  SA05                    Plans & Feature Access  Set available plan or
                                                  feature access for each
                                                  organisation; billing
                                                  can be added if the
                                                  business model requires
                                                  it

  SA06                    Platform Settings       Platform-wide settings,
                                                  default configuration
                                                  and service information

  SA07                    Support & Requests      Receive and manage
                                                  organisation support
                                                  requests

  SA08                    Platform Activity &     Review important
                          Audit                   platform-level actions
                                                  and access changes
  -----------------------------------------------------------------------

### Creating a new organisation

When a committee wants to use QurbaniOS:

1.  Super Admin selects **Create Organisation**.
2.  Enters organisation name, locality and contact details.
3.  Adds the main Committee Admin's name and email/mobile number.
4.  Selects the access plan or enabled features, if plans are used.
5.  Creates the organisation workspace.
6.  Sends an invitation or login instructions to the Committee Admin.
7.  The Committee Admin logs in and sets up their annual programme.

### What the Committee Admin sees

After the organisation is created, the Committee Admin logs in and sees
only their own organisation's QurbaniOS workspace.

They can manage:

-   Their annual programme.
-   Their household records.
-   Their participants and registrations.
-   Their animals and groups.
-   Their payments and expenses.
-   Their volunteers and operations.
-   Their distribution and reports.

They cannot see or manage another organisation's records.

### Universal SaaS rules

-   Every organisation must have a unique organisation ID.
-   Every organisation's records must be linked to that organisation ID.
-   Data from one organisation must never appear in another
    organisation's workspace.
-   A user must belong to an organisation before accessing its private
    records.
-   A Committee Admin can manage only the organisation assigned to them.
-   Super Admin access is for platform management, not routine editing
    of committee records.
-   Any exceptional support access to an organisation's private data
    must be authorised, limited and recorded.
-   Organisation access can be activated, suspended or closed by the
    Super Admin.
-   Closing an organisation must not silently delete its historical
    programme records.
-   Platform-wide settings must be separate from each organisation's
    programme settings.

## 3. Public Interface

For anyone who wants to explore the programme, whether they participate
in Aḍḥiyah or not.

### User journey

1.  User opens QurbaniOS.
2.  Sees the intro and landing page.
3.  Explores programme information.
4.  Checks guidelines, pricing and announcements.
5.  Views general programme progress.
6.  Explores public distribution information.
7.  Logs in or registers if personal access is needed.

### Pages

  -----------------------------------------------------------------------
  ID                      Page                    Main contents
  ----------------------- ----------------------- -----------------------
  PUB01                   Splash / Intro          QurbaniOS branding and
                                                  loading

  PUB02                   Landing Page            Programme introduction,
                                                  status and key actions

  PUB03                   About Programme         Purpose and explanation
                                                  of the programme

  PUB04                   Guidelines & Pricing    Dates, requirements,
                                                  pricing and guidelines

  PUB05                   Announcements           Public notices and
                                                  updates

  PUB06                   Programme Overview      Publicly shareable
                                                  programme progress and
                                                  statistics

  PUB07                   Public Distribution     Eligibility guidance,
                                                  locations and
                                                  collection arrangements

  PUB08                   FAQ & Contact           Common questions and
                                                  committee contact
                                                  details

  PUB09                   Login / Registration    Entry to participant or
                                                  beneficiary access
  -----------------------------------------------------------------------

### M2 features

-   Programme information.
-   Registration dates and pricing.
-   Public announcements.
-   General programme progress.
-   Publicly shareable financial summaries.
-   Public distribution information.
-   Eligibility guidelines.
-   Collection locations and schedules.
-   Enquiry and committee contact information.

Public visitors can explore these pages without logging in. Personal
information must never be exposed publicly.

## 4. Participant Interface

For people who register and participate in the Aḍḥiyah programme.

### User journey

1.  User registers or logs in.
2.  Submits personal and household details.
3.  Selects the participation option.
4.  Waits for committee approval.
5.  Views registration status.
6.  Checks assigned animal, group and share.
7.  Views payment details and receipts.
8.  Tracks slaughter and processing progress.
9.  Checks the distribution schedule.
10. Receives collection confirmation.

### Pages

  -----------------------------------------------------------------------
  ID                      Page                    Main contents
  ----------------------- ----------------------- -----------------------
  PAR01                   Dashboard               Personal participation
                                                  overview and current
                                                  status

  PAR02                   Profile & Household     Personal and household
                                                  details

  PAR03                   Registration            Application details and
                                                  status

  PAR04                   My Participation        Assigned group, animal
                                                  and share

  PAR05                   Payments                Fees, paid amount,
                                                  outstanding balance and
                                                  history

  PAR06                   Receipts                Registration
                                                  confirmation and
                                                  payment receipts

  PAR07                   Programme Tracking      Slaughter and
                                                  processing progress

  PAR08                   Distribution            Allocation, schedule,
                                                  location and collection
                                                  status

  PAR09                   Updates & Support       Notifications and
                                                  committee contact
  -----------------------------------------------------------------------

### M2 features

-   Online registration.
-   Registration status.
-   Animal, group and share details.
-   Payment history and outstanding balance.
-   Registration confirmation and payment receipts.
-   Slaughter and processing tracking.
-   Distribution schedule and location.
-   Collection status.
-   Notifications and committee contact.

Participants can only view their own private information. They cannot
independently verify payments, change animal allocations or confirm
operational activities.

## 5. Public Beneficiary Interface

For people who do **not** participate in Aḍḥiyah but may receive meat
through public distribution.

Beneficiaries are not participant registrants and do not make
participant payments.

### User journey

1.  Committee registers a recipient household.
2.  Committee verifies eligibility.
3.  Beneficiary receives an access reference or instructions.
4.  Beneficiary verifies their identity and logs in.
5.  Views eligibility status.
6.  Checks personal allocation details when confirmed.
7.  Views collection date and location.
8.  Tracks distribution.
9.  Receives collection confirmation.

### Pages

  -----------------------------------------------------------------------
  ID                      Page                    Main contents
  ----------------------- ----------------------- -----------------------
  BEN01                   Beneficiary Access      Login and identity
                                                  verification

  BEN02                   My Distribution         Eligibility and overall
                          Dashboard               distribution status

  BEN03                   Household Details       Verified household
                                                  information

  BEN04                   Allocation Details      Personal allocation
                                                  information, when
                                                  confirmed

  BEN05                   Collection Schedule     Date, location and
                                                  collection instructions

  BEN06                   Distribution Tracking   Allocation, packing and
                                                  collection progress

  BEN07                   Updates & Support       Notifications and
                                                  committee contact
  -----------------------------------------------------------------------

### M2 features

-   Beneficiary household registration by the committee.
-   Eligibility verification and status.
-   Secure beneficiary access.
-   Household information.
-   Personal allocation details.
-   Collection date, location and instructions.
-   Distribution tracking.
-   Notifications and committee support.
-   Public enquiry route for households seeking information.

### Important rules

-   Beneficiary registration is separate from participant registration.
-   Beneficiaries do not need to make participant payments.
-   Public visitors can explore general distribution information without
    logging in.
-   Personal beneficiary information requires authentication.
-   Eligibility and final inclusion remain subject to committee
    approval.
-   Public and participant distribution use separate recipient records
    and permissions, while sharing central quantity accounting.

## 6. Committee / Admin Interface

For the organising committee. This is the main management system of
QurbaniOS.

### Admin dashboard

After login, the admin sees an overview of the programme:

-   Total households.
-   Total participants.
-   Pending and approved registrations.
-   Animals registered and allocation status.
-   Payment collections and outstanding balances.
-   Total expenses.
-   Volunteer and department status.
-   Slaughter and processing progress.
-   Distribution progress.
-   Pending actions and recent activities.

### Pages and features

  -----------------------------------------------------------------------
  ID                      Page                    Main contents
  ----------------------- ----------------------- -----------------------
  ADM01                   Dashboard               Programme statistics,
                                                  registration, finance,
                                                  animal and operational
                                                  overview, pending
                                                  actions and recent
                                                  activity

  ADM02                   Programme Setup         Create annual
                                                  programme; set dates,
                                                  limits, pricing,
                                                  guidelines and public
                                                  information

  ADM03                   Household Management    Import CSV/Excel, view,
                                                  search, edit and manage
                                                  household records

  ADM04                   Participant Management  Participant directory,
                                                  registration overview,
                                                  search and filtering

  ADM05                   Registration Details    Review applications,
                                                  household and
                                                  participation details;
                                                  approve, reject or
                                                  manage cancellation

  ADM06                   Animal Management       Register animals,
                                                  suppliers, procurement
                                                  details and relevant
                                                  records

  ADM07                   Groups & Allocation     Create animal groups,
                                                  configure shares,
                                                  assign participants and
                                                  prevent duplicate or
                                                  excess allocation

  ADM08                   Finance Dashboard       Expected collections,
                                                  verified payments,
                                                  outstanding balances,
                                                  expenses and financial
                                                  summary

  ADM09                   Payment Management      View and verify
                                                  payments, review
                                                  volunteer cash
                                                  submissions, record
                                                  authorised payments and
                                                  generate receipts

  ADM10                   Expense Management      Record, categorise and
                                                  review expenses and
                                                  expenditure history

  ADM11                   Volunteer Management    Add volunteers, create
                                                  accounts, assign
                                                  departments, tasks and
                                                  permissions

  ADM12                   Operations Scheduling   Create slaughter and
                                                  processing schedules;
                                                  assign animals and
                                                  teams

  ADM13                   Operations Monitoring   Monitor slaughter and
                                                  processing progress,
                                                  delays and reported
                                                  issues

  ADM14                   Distribution Setup      Register recipient
                                                  households; configure
                                                  eligibility and
                                                  participant/public
                                                  distribution policies

  ADM15                   Distribution Management Manage quantities,
                                                  allocations, packages,
                                                  collection and
                                                  delivery; reconcile
                                                  available quantities

  ADM16                   Communication Centre    Publish announcements
                                                  and send email/in-app
                                                  notifications

  ADM17                   Reports                 Registration,
                                                  participant, animal,
                                                  allocation, payment,
                                                  expense and financial
                                                  reports; Excel/PDF
                                                  export
  -----------------------------------------------------------------------

### Admin workflow

1.  Create and configure the annual programme.
2.  Import Mahallu household records.
3.  Open registration.
4.  Review and approve participant applications.
5.  Register procured animals.
6.  Create animal groups and allocate participant shares.
7.  Manage payment collection, verification and expenses.
8.  Create volunteer accounts and assign departments.
9.  Prepare slaughter and processing schedules.
10. Monitor ground-level operations.
11. Register public beneficiary households and configure distribution
    policies.
12. Manage participant and public distribution.
13. Publish announcements and notifications.
14. Generate reports and close/archive the programme.

These activities can happen in parallel where appropriate. The system
should enforce only genuine dependencies, such as requiring a confirmed
animal assignment before scheduling its slaughter.

## 7. Volunteer Interface

For volunteers working in the programme.

There are four departments:

1.  Slaughter
2.  Processing
3.  Distribution
4.  Finance

All volunteers use the same application structure. Their department
workspace, data and permissions are determined by the committee's
assignment.

### Volunteer journey

1.  Committee creates a volunteer account.
2.  Assigns a department and relevant permissions.
3.  Volunteer receives login instructions.
4.  Volunteer logs in.
5.  Assigned department dashboard appears.
6.  Volunteer views tasks and schedule.
7.  Performs assigned activities.
8.  Updates task and operational progress.
9.  Reports problems when necessary.
10. Committee receives the updates.

### Pages

  -----------------------------------------------------------------------
  ID                      Page                    Main contents
  ----------------------- ----------------------- -----------------------
  VOL01                   Dashboard               Volunteer information,
                                                  department, task
                                                  summary, schedule and
                                                  notifications

  VOL02                   My Tasks                Assigned tasks and
                                                  progress updates

  VOL03                   Department Workspace    Department-specific
                                                  operational records and
                                                  actions

  VOL04                   Schedule & Team         Assigned activities,
                                                  timing, team leader and
                                                  members

  VOL05                   Issue Reporting         Report and track
                                                  operational problems

  VOL06                   Notifications & Profile Committee updates and
                                                  account information
  -----------------------------------------------------------------------

### Department responsibilities

#### A. Slaughter

-   View assigned animals.
-   View schedules and team assignments.
-   Update slaughter activity status.
-   Confirm completion.
-   Report operational issues.

#### B. Processing

-   View animals awaiting processing.
-   Update cutting progress.
-   Record actual weighing information where required.
-   Update packaging status.
-   Confirm processing completion.
-   Report shortages or other issues.

#### C. Distribution

-   View assigned participant and beneficiary distribution queues.
-   View package allocations and collection arrangements.
-   Verify recipient or collection references.
-   Confirm collection or delivery.
-   Report shortages and discrepancies.

#### D. Finance

-   View assigned participants and collection responsibilities.
-   Record cash payments received.
-   Submit collection records.
-   Track verification status.

### Shared volunteer features

-   Personal dashboard.
-   Assigned department.
-   My tasks.
-   Task progress updates.
-   Schedule and team details.
-   Issue reporting.
-   Notifications.
-   Profile and account details.

## 8. Complete End-to-End Workflow

### SaaS onboarding workflow

This happens before an organisation starts its Aḍḥiyah programme:

1.  A committee contacts QurbaniOS or requests access.
2.  Super Admin creates the organisation workspace.
3.  Super Admin creates or invites the main Committee Admin.
4.  Committee Admin receives login instructions.
5.  Committee Admin logs in and configures the organisation's annual
    programme.
6.  The organisation publishes its public programme page.
7.  Participants, beneficiaries and volunteers use that organisation's
    workspace.

The application follows one connected operational workflow:

1.  Public user explores QurbaniOS.
2.  Participant submits registration.
3.  Committee reviews and approves the registration.
4.  Payment is collected and submitted.
5.  Authorised finance committee member verifies payment.
6.  Committee registers animals and creates groups.
7.  Approved participants are assigned animal shares.
8.  Committee assigns volunteers and prepares schedules.
9.  Slaughter team updates slaughter progress.
10. Processing team updates cutting, weighing and packaging progress.
11. Committee configures participant and public distribution.
12. Committee generates and confirms allocations.
13. Distribution team handles packages and collection.
14. Participants and beneficiaries track their own distribution.
15. Committee finalises financial and operational reports.

### Simplified workflow diagram

``` mermaid
flowchart TD
    A["Public Exploration"] --> B["Participant Registration"]
    B --> C["Committee Approval"]
    C --> D["Payment Collection"]
    D --> E["Finance Verification"]
    E --> F["Animal & Share Allocation"]
    F --> G["Volunteer Assignment & Scheduling"]
    G --> H["Slaughter"]
    H --> I["Processing"]
    I --> J["Distribution Setup"]
    J --> K["Allocation & Packing"]
    K --> L["Collection / Delivery"]
    L --> M["Final Reports & Programme Closure"]

    N["Committee Registers Beneficiary Households"] --> O["Eligibility Verification"]
    O --> J
    M --> P["Annual Records Archived"]
```

## 9. M2 Page Count

  Interface              Logical pages
  -------------------- ---------------
  Public                             9
  Participant                        9
  Public Beneficiary                 7
  Committee / Admin                 17
  Volunteers                         6
  **Total**                     **48**

These are logical pages, not necessarily 48 separate routes. Related
pages may share reusable layouts and components.

## 10. M2 Development Priorities

Recommended development order:

  ---------------------------------------------------------------------
  Phase                              Modules
  ---------------------------------- ----------------------------------
  1                                  Public interface, authentication
                                     and programme setup

  2                                  Household management, participant
                                     registration and participant
                                     dashboard

  3                                  Animal management, groups and
                                     share allocation

  4                                  Finance and payment verification

  5                                  Volunteer management and
                                     department workspaces

  6                                  Scheduling, slaughter and
                                     processing operations

  7                                  Public beneficiary access and
                                     distribution management

  8                                  Communication, reports and
                                     programme closure
  ---------------------------------------------------------------------

The order follows operational dependencies. Some modules, such as
finance, animal procurement and volunteer preparation, can be developed
or operated in parallel.

## 11. Essential System Rules

-   One application with role-based interfaces.
-   Mobile-first design for participants, beneficiaries and volunteers.
-   Desktop-friendly committee dashboard.
-   Users can only access information permitted by their role.
-   Public users cannot view private household or beneficiary
    information.
-   Beneficiaries and participants have separate records and access
    permissions.
-   Payment verification is restricted to authorised committee members.
-   Cash collection submissions are not treated as verified payments
    until approved.
-   Animal and share allocations must not exceed configured capacity.
-   Operational status changes must record the user and timestamp.
-   Processing quantities must reflect actual recorded quantities.
-   Distribution allocations must not exceed available recorded
    quantities.
-   Participant and public distribution follow configurable committee
    policies.
-   Important changes to financial, allocation and operational records
    must be auditable.
-   Annual programme records must be retained separately for future
    reference.

## 12. M3 --- Out of Scope for Initial M2 Delivery

The following are future enhancements and should be implemented only
after the M2 workflow is functional:

-   Year-to-year analytics and interactive charts.
-   Smart participant-to-animal allocation.
-   Financial anomaly detection and reconciliation assistance.
-   Operational bottleneck and delay detection.
-   Automated distribution optimisation.
-   Household duplicate detection assistance.
-   Custom report builder.
-   Volunteer performance and workload analytics.
-   Automatic overdue task alerts.
-   Issue attachments.
-   Participant payment reminders.
-   Online payment gateway integration, if required.
-   Participation history.
-   Feedback and satisfaction surveys.
-   Public interactive statistics and timeline.
-   AI-assisted FAQ.

------------------------------------------------------------------------

## 13. Simple Role Structure

  -----------------------------------------------------------------------
  Role                                Main responsibility
  ----------------------------------- -----------------------------------
  Super Admin                         Owns and manages QurbaniOS and
                                      provides access to organisations

  Committee Admin                     Manages their own organisation and
                                      annual Aḍḥiyah programme

  Volunteer                           Completes assigned department work

  Participant                         Manages their own Aḍḥiyah
                                      participation

  Public Beneficiary                  Views their own public distribution
                                      information

  Public Visitor                      Explores information available to
                                      everyone
  -----------------------------------------------------------------------

**Remember:** Super Admin is above the organisations in the SaaS
structure. Committee Admins are not Super Admins. They manage only their
own organisation.

------------------------------------------------------------------------

## Project Goal

Make QurbaniOS simple enough for ordinary people to use, powerful enough
for the committee to manage the programme, and organised enough for
volunteers to complete their responsibilities without confusion.

**M2 first. M3 next. One connected Aḍḥiyah management system.**
