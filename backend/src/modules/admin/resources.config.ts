/**
 * One declarative registry that drives the generic admin CRUD API (resources.controller.ts)
 * AND the admin dashboard UI (served to it through GET /admin/resources/:name/meta).
 * To add a new admin tab: add an entry here and a one-line page in admin-dashboard.
 */
export type FieldType = 'text' | 'textarea' | 'number' | 'bool' | 'datetime' | 'enum' | 'relation' | 'tags' | 'category';

export interface Field {
  key: string; label: string; type: FieldType;
  required?: boolean; readonly?: boolean; createOnly?: boolean;
  options?: string[];            // enum
  resource?: string;             // relation: another resource name
  categoryType?: string;         // category: Category.type used for suggestions
  help?: string; filter?: boolean; int?: boolean; default?: any;
}
export interface Action {
  label: string; tone?: 'good' | 'bad' | 'neutral'; confirm?: string;
  kind: 'set' | 'call';
  data?: Record<string, any>;                                 // kind=set: PATCH the row with these values
  method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE'; url?: string; // kind=call: ':id' is replaced
  body?: Record<string, any>;                                 // kind=call: fixed fields added to the request body
  prompt?: { field: string; label: string };                 // asks the admin for a value and sends it in the body
  when?: { field: string; in: string[] };
}
export interface Resource {
  model: string; title: string; description: string;
  columns: { label: string; path: string; kind?: 'money' | 'date' | 'bool' | 'badge' | 'tags' }[];
  fields: Field[]; search: string[];
  include?: any; orderBy?: any;
  allowCreate?: boolean; delete?: 'hard' | { soft: Record<string, any> } | false;
  optionLabel?: string;           // path used when this resource is shown in a relation dropdown
  actions?: Action[];
}

const CONTEST_STATUS = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUIRED', 'APPROVED', 'REJECTED', 'LIVE', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED', 'CANCELLED'];
const USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'CONTENT_MODERATOR', 'SUPPORT_ADMIN', 'CONTEST_MANAGER', 'TALENT_MANAGER', 'HOST', 'JUDGE', 'RECRUITER', 'TALENT', 'PARTICIPANT'];

export const RESOURCES: Record<string, Resource> = {
  categories: {
    model: 'category', title: 'Categories', description: 'Category lists used by contests, talents, auditions and reels in the apps and website. Changes show up everywhere straight away.',
    columns: [{ label: 'Icon', path: 'icon' }, { label: 'Name', path: 'name' }, { label: 'Type', path: 'type', kind: 'badge' }, { label: 'Order', path: 'sortOrder' }, { label: 'Active', path: 'active', kind: 'bool' }],
    fields: [
      { key: 'type', label: 'Type', type: 'enum', required: true, options: ['CONTEST', 'REEL', 'TALENT', 'AUDITION'], filter: true },
      { key: 'name', label: 'Name', type: 'text', required: true }, { key: 'icon', label: 'Icon (emoji)', type: 'text' },
      { key: 'sortOrder', label: 'Sort order', type: 'number', int: true, default: 0 }, { key: 'active', label: 'Active', type: 'bool', default: true, filter: true },
    ],
    search: ['name'], orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }], allowCreate: true, delete: 'hard', optionLabel: 'name',
  },
  users: {
    model: 'user', title: 'Users', description: 'Everyone on the platform. Deleting a user marks the account as deleted so their history is kept.',
    columns: [{ label: 'Name', path: 'name' }, { label: 'Mobile', path: 'mobile' }, { label: 'Role', path: 'role', kind: 'badge' }, { label: 'Status', path: 'status', kind: 'badge' }, { label: 'City', path: 'city' }, { label: 'XP', path: 'xp' }, { label: 'Joined', path: 'createdAt', kind: 'date' }],
    fields: [
      { key: 'mobile', label: 'Mobile', type: 'text', required: true }, { key: 'name', label: 'Name', type: 'text' }, { key: 'email', label: 'Email', type: 'text' },
      { key: 'role', label: 'Role', type: 'enum', options: USER_ROLES, required: true, filter: true, default: 'PARTICIPANT' },
      { key: 'status', label: 'Status', type: 'enum', options: ['ACTIVE', 'SUSPENDED', 'BLOCKED', 'PENDING_VERIFICATION', 'DELETED'], required: true, filter: true, default: 'ACTIVE' },
      { key: 'city', label: 'City', type: 'text' }, { key: 'profilePhoto', label: 'Photo URL', type: 'text' }, { key: 'xp', label: 'XP', type: 'number', int: true, readonly: true },
    ],
    search: ['name', 'mobile', 'email'], orderBy: { createdAt: 'desc' }, allowCreate: true, delete: { soft: { status: 'DELETED' } }, optionLabel: 'name',
  },
  contests: {
    model: 'contest', title: 'Contests', description: 'Create, edit, approve, reject or remove contests.',
    columns: [{ label: 'Title', path: 'title' }, { label: 'Category', path: 'category' }, { label: 'Host', path: 'host.name' }, { label: 'Entry', path: 'entryFee', kind: 'money' }, { label: 'Prize pool', path: 'prizePool', kind: 'money' }, { label: 'Closes', path: 'registrationClosesAt', kind: 'date' }, { label: 'Status', path: 'status', kind: 'badge' }],
    include: { host: { select: { name: true, mobile: true } } },
    fields: [
      { key: 'hostId', label: 'Host', type: 'relation', resource: 'users', required: true, createOnly: true },
      { key: 'title', label: 'Title', type: 'text', required: true }, { key: 'description', label: 'Description', type: 'textarea', required: true },
      { key: 'category', label: 'Category', type: 'category', categoryType: 'CONTEST', required: true, filter: true }, { key: 'subcategory', label: 'Subcategory', type: 'text' },
      { key: 'bannerUrl', label: 'Banner URL', type: 'text' }, { key: 'promoVideoUrl', label: 'Promo video URL', type: 'text' }, { key: 'rules', label: 'Rules', type: 'textarea' },
      { key: 'mode', label: 'Mode', type: 'enum', options: ['ONLINE', 'OFFLINE', 'HYBRID'], default: 'ONLINE', filter: true }, { key: 'venueAddress', label: 'Venue', type: 'text' },
      { key: 'minAge', label: 'Min age', type: 'number', int: true }, { key: 'maxAge', label: 'Max age', type: 'number', int: true },
      { key: 'registrationOpensAt', label: 'Registration opens', type: 'datetime', required: true }, { key: 'registrationClosesAt', label: 'Registration closes', type: 'datetime', required: true },
      { key: 'startDate', label: 'Starts', type: 'datetime', required: true }, { key: 'endDate', label: 'Ends', type: 'datetime', required: true },
      { key: 'entryFee', label: 'Entry fee (₹)', type: 'number', default: 0 }, { key: 'maxParticipants', label: 'Max participants', type: 'number', int: true },
      { key: 'numWinners', label: 'Winners', type: 'number', int: true, default: 1 }, { key: 'prizePool', label: 'Prize pool (₹)', type: 'number', default: 0 },
      { key: 'commissionPct', label: 'Commission override (%)', type: 'number', help: 'Leave empty to use the global contest commission' },
      { key: 'publicVotingEnabled', label: 'Public voting', type: 'bool', default: false }, { key: 'judgeWeightPct', label: 'Judge weight (%)', type: 'number', default: 70 }, { key: 'voteWeightPct', label: 'Public vote weight (%)', type: 'number', default: 30 },
      { key: 'status', label: 'Status', type: 'enum', options: CONTEST_STATUS, filter: true, default: 'DRAFT', help: 'Approving or rejecting here also notifies the host' },
      { key: 'rejectionNote', label: 'Rejection note', type: 'text' },
    ],
    search: ['title', 'category'], orderBy: { createdAt: 'desc' }, allowCreate: true, delete: 'hard', optionLabel: 'title',
    actions: [
      { label: 'Approve', tone: 'good', kind: 'call', method: 'PATCH', url: '/admin/contests/:id/approve', when: { field: 'status', in: ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUIRED'] } },
      { label: 'Reject', tone: 'bad', kind: 'call', method: 'PATCH', url: '/admin/contests/:id/reject', prompt: { field: 'reason', label: 'Reason for rejection' }, when: { field: 'status', in: ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUIRED'] } },
      { label: 'Cancel', tone: 'bad', kind: 'set', data: { status: 'CANCELLED' }, confirm: 'Cancel this contest?', when: { field: 'status', in: ['APPROVED', 'LIVE', 'REGISTRATION_CLOSED', 'ONGOING'] } },
    ],
  },
  registrations: {
    model: 'contestRegistration', title: 'Contest registrations', description: 'Participants registered in contests. Disqualify, correct ranks, or remove a registration.',
    columns: [{ label: 'Participant', path: 'user.name' }, { label: 'Mobile', path: 'user.mobile' }, { label: 'Contest', path: 'contest.title' }, { label: 'Score', path: 'finalScore' }, { label: 'Rank', path: 'rank' }, { label: 'Buzzer', path: 'goldenBuzzer', kind: 'bool' }, { label: 'Status', path: 'status', kind: 'badge' }],
    include: { user: { select: { name: true, mobile: true } }, contest: { select: { title: true } } },
    fields: [
      { key: 'status', label: 'Status', type: 'enum', options: ['PENDING_PAYMENT', 'REGISTERED', 'DISQUALIFIED', 'WITHDRAWN'], filter: true },
      { key: 'rank', label: 'Rank', type: 'number', int: true }, { key: 'goldenBuzzer', label: 'Golden Buzzer', type: 'bool' },
      { key: 'judgeFeedback', label: 'Judge feedback', type: 'textarea' }, { key: 'performanceUrl', label: 'Performance URL', type: 'text' },
      { key: 'judgeScore', label: 'Judge score', type: 'number', readonly: true }, { key: 'finalScore', label: 'Final score', type: 'number', readonly: true },
    ],
    search: [], orderBy: { createdAt: 'desc' }, delete: 'hard',
    actions: [{ label: 'Disqualify', tone: 'bad', kind: 'set', data: { status: 'DISQUALIFIED' }, confirm: 'Disqualify this participant?', when: { field: 'status', in: ['REGISTERED'] } }],
  },
  auditions: {
    model: 'audition', title: 'Auditions', description: 'Casting calls posted by recruiters. Approve to publish them.',
    columns: [{ label: 'Title', path: 'title' }, { label: 'Company', path: 'companyName' }, { label: 'Category', path: 'category' }, { label: 'Location', path: 'location' }, { label: 'Deadline', path: 'applicationDeadline', kind: 'date' }, { label: 'Status', path: 'status', kind: 'badge' }],
    include: { recruiter: { select: { name: true } } },
    fields: [
      { key: 'recruiterId', label: 'Recruiter', type: 'relation', resource: 'users', required: true, createOnly: true },
      { key: 'title', label: 'Title', type: 'text', required: true }, { key: 'companyName', label: 'Company', type: 'text' },
      { key: 'category', label: 'Category', type: 'category', categoryType: 'AUDITION', required: true, filter: true }, { key: 'designation', label: 'Designation', type: 'text' },
      { key: 'posterUrl', label: 'Poster URL', type: 'text' }, { key: 'description', label: 'Description', type: 'textarea', required: true }, { key: 'requirements', label: 'Requirements', type: 'textarea' },
      { key: 'minAge', label: 'Min age', type: 'number', int: true }, { key: 'maxAge', label: 'Max age', type: 'number', int: true }, { key: 'gender', label: 'Gender', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' }, { key: 'compensation', label: 'Compensation', type: 'text' },
      { key: 'applicationDeadline', label: 'Application deadline', type: 'datetime', required: true }, { key: 'auditionDate', label: 'Audition date', type: 'datetime' },
      { key: 'numOpenings', label: 'Openings', type: 'number', int: true, default: 1 },
      { key: 'status', label: 'Status', type: 'enum', options: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'LIVE', 'CLOSED'], filter: true, default: 'DRAFT' },
    ],
    search: ['title', 'companyName', 'category'], orderBy: { createdAt: 'desc' }, allowCreate: true, delete: 'hard', optionLabel: 'title',
    actions: [
      { label: 'Approve', tone: 'good', kind: 'call', method: 'PATCH', url: '/admin/auditions/:id/approve', when: { field: 'status', in: ['SUBMITTED', 'DRAFT', 'REJECTED'] } },
      { label: 'Reject', tone: 'bad', kind: 'call', method: 'PATCH', url: '/admin/auditions/:id/reject', when: { field: 'status', in: ['SUBMITTED', 'LIVE'] } },
      { label: 'Close', tone: 'neutral', kind: 'set', data: { status: 'CLOSED' }, when: { field: 'status', in: ['LIVE'] } },
    ],
  },
  reels: {
    model: 'reel', title: 'Reels', description: 'All reels. Remove or restore content, edit captions and categories.',
    columns: [{ label: 'Creator', path: 'user.name' }, { label: 'Caption', path: 'caption' }, { label: 'Category', path: 'category' }, { label: 'Views', path: 'views' }, { label: 'Likes', path: 'likes' }, { label: 'Status', path: 'status', kind: 'badge' }],
    include: { user: { select: { name: true } } },
    fields: [
      { key: 'userId', label: 'Creator', type: 'relation', resource: 'users', required: true, createOnly: true },
      { key: 'videoUrl', label: 'Video URL', type: 'text', required: true }, { key: 'thumbnailUrl', label: 'Thumbnail URL', type: 'text' },
      { key: 'category', label: 'Category', type: 'category', categoryType: 'REEL', required: true, filter: true }, { key: 'caption', label: 'Caption', type: 'textarea' },
      { key: 'hashtags', label: 'Hashtags', type: 'tags', help: 'Comma separated' },
      { key: 'status', label: 'Status', type: 'enum', options: ['PUBLISHED', 'PENDING_REVIEW', 'PROCESSING', 'REMOVED'], filter: true, default: 'PUBLISHED' },
      { key: 'views', label: 'Views', type: 'number', int: true, readonly: true }, { key: 'likes', label: 'Likes', type: 'number', int: true, readonly: true },
    ],
    search: ['caption', 'category'], orderBy: { createdAt: 'desc' }, allowCreate: true, delete: 'hard', optionLabel: 'caption',
    actions: [
      { label: 'Approve', tone: 'good', kind: 'set', data: { status: 'PUBLISHED' }, when: { field: 'status', in: ['PENDING_REVIEW', 'REMOVED'] } },
      { label: 'Remove', tone: 'bad', kind: 'set', data: { status: 'REMOVED' }, confirm: 'Remove this reel from the app?', when: { field: 'status', in: ['PUBLISHED', 'PENDING_REVIEW'] } },
    ],
  },
  talents: {
    model: 'talentProfile', title: 'Talents', description: 'Bookable talent profiles. Verify them before they appear in search.',
    columns: [{ label: 'Stage name', path: 'stageName' }, { label: 'Person', path: 'user.name' }, { label: 'Category', path: 'category' }, { label: 'Base price', path: 'basePrice', kind: 'money' }, { label: 'City', path: 'city' }, { label: 'Rating', path: 'rating' }, { label: 'Verified', path: 'verified', kind: 'bool' }],
    include: { user: { select: { name: true, mobile: true } } },
    fields: [
      { key: 'userId', label: 'User', type: 'relation', resource: 'users', required: true, createOnly: true },
      { key: 'stageName', label: 'Stage name', type: 'text' }, { key: 'category', label: 'Category', type: 'category', categoryType: 'TALENT', required: true, filter: true },
      { key: 'skills', label: 'Skills', type: 'tags' }, { key: 'basePrice', label: 'Base price (₹)', type: 'number', required: true },
      { key: 'serviceRadiusKm', label: 'Service radius (km)', type: 'number', int: true }, { key: 'city', label: 'City', type: 'text' },
      { key: 'portfolioUrls', label: 'Portfolio URLs', type: 'tags' }, { key: 'verified', label: 'Verified', type: 'bool', filter: true, default: false }, { key: 'rating', label: 'Rating', type: 'number', readonly: true },
    ],
    search: ['stageName', 'category', 'city'], orderBy: { createdAt: 'desc' }, allowCreate: true, delete: 'hard', optionLabel: 'stageName',
    actions: [
      { label: 'Verify', tone: 'good', kind: 'set', data: { verified: true }, when: { field: 'verified', in: ['false'] } },
      { label: 'Unverify', tone: 'bad', kind: 'set', data: { verified: false }, when: { field: 'verified', in: ['true'] } },
    ],
  },
  bookings: {
    model: 'booking', title: 'Bookings', description: 'Talent bookings. Prices and commission are fixed when the booking is made; admins can correct status and event details.',
    columns: [{ label: 'Talent', path: 'talent.stageName' }, { label: 'Customer', path: 'customer.name' }, { label: 'Event', path: 'eventType' }, { label: 'Date', path: 'eventDate', kind: 'date' }, { label: 'Amount', path: 'amount', kind: 'money' }, { label: 'Commission %', path: 'commissionPct' }, { label: 'Status', path: 'status', kind: 'badge' }],
    include: { talent: { select: { stageName: true } }, customer: { select: { name: true, mobile: true } } },
    fields: [
      { key: 'status', label: 'Status', type: 'enum', options: ['REQUESTED', 'ACCEPTED', 'REJECTED', 'ADVANCE_PAID', 'CONFIRMED', 'PERFORMED', 'COMPLETED', 'CANCELLED', 'DISPUTED'], filter: true },
      { key: 'eventType', label: 'Event type', type: 'text' }, { key: 'eventDate', label: 'Event date', type: 'datetime' },
      { key: 'startTime', label: 'Start time', type: 'text' }, { key: 'endTime', label: 'End time', type: 'text' }, { key: 'venueAddress', label: 'Venue', type: 'text' },
      { key: 'amount', label: 'Amount (₹)', type: 'number', readonly: true }, { key: 'advanceAmount', label: 'Advance (₹)', type: 'number', readonly: true }, { key: 'balanceAmount', label: 'Balance (₹)', type: 'number', readonly: true },
    ],
    search: ['eventType', 'venueAddress'], orderBy: { createdAt: 'desc' }, delete: 'hard',
    actions: [{ label: 'Cancel', tone: 'bad', kind: 'set', data: { status: 'CANCELLED' }, confirm: 'Cancel this booking?', when: { field: 'status', in: ['REQUESTED', 'ACCEPTED', 'ADVANCE_PAID', 'CONFIRMED'] } }],
  },
  battles: {
    model: 'battle', title: 'Battles', description: 'Head-to-head reel battles. Votes are read-only.',
    columns: [{ label: 'Title', path: 'title' }, { label: 'Votes A', path: 'votesA' }, { label: 'Votes B', path: 'votesB' }, { label: 'Ends', path: 'endsAt', kind: 'date' }, { label: 'Status', path: 'status', kind: 'badge' }],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true }, { key: 'reelAId', label: 'Reel A', type: 'relation', resource: 'reels', required: true, createOnly: true }, { key: 'reelBId', label: 'Reel B', type: 'relation', resource: 'reels', required: true, createOnly: true },
      { key: 'endsAt', label: 'Ends at', type: 'datetime' }, { key: 'status', label: 'Status', type: 'enum', options: ['LIVE', 'CLOSED'], filter: true, default: 'LIVE' },
      { key: 'votesA', label: 'Votes A', type: 'number', int: true, readonly: true }, { key: 'votesB', label: 'Votes B', type: 'number', int: true, readonly: true },
    ],
    search: ['title'], orderBy: { createdAt: 'desc' }, allowCreate: true, delete: 'hard',
    actions: [{ label: 'Close and pick winner', tone: 'neutral', kind: 'call', method: 'PATCH', url: '/admin/battles/:id/close', when: { field: 'status', in: ['LIVE'] } }],
  },
  ads: {
    model: 'advertisement', title: 'Advertising', description: 'Banners and sponsored placements shown in the app. Paid-plan users never see ads.',
    columns: [{ label: 'Title', path: 'title' }, { label: 'Type', path: 'type', kind: 'badge' }, { label: 'Placement', path: 'placement' }, { label: 'Starts', path: 'startDate', kind: 'date' }, { label: 'Ends', path: 'endDate', kind: 'date' }, { label: 'Views', path: 'impressions' }, { label: 'Clicks', path: 'clicks' }, { label: 'Status', path: 'status', kind: 'badge' }],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true }, { key: 'type', label: 'Type', type: 'enum', options: ['BANNER', 'VIDEO', 'REEL', 'SPONSORED_TALENT', 'SPONSORED_CONTEST', 'NATIVE'], required: true, default: 'BANNER', filter: true },
      { key: 'placement', label: 'Placement', type: 'enum', options: ['HOME_BANNER', 'REELS_FEED', 'CONTEST_SECTION', 'TALENT_SECTION'], required: true, default: 'HOME_BANNER', filter: true },
      { key: 'mediaUrl', label: 'Image / video URL', type: 'text' }, { key: 'targetUrl', label: 'Link when tapped', type: 'text' }, { key: 'category', label: 'Category', type: 'text' }, { key: 'city', label: 'City', type: 'text' },
      { key: 'startDate', label: 'Start', type: 'datetime', required: true }, { key: 'endDate', label: 'End', type: 'datetime', required: true }, { key: 'budget', label: 'Budget (₹)', type: 'number' },
      { key: 'status', label: 'Status', type: 'enum', options: ['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED'], default: 'DRAFT', filter: true },
    ],
    search: ['title', 'placement'], orderBy: { createdAt: 'desc' }, allowCreate: true, delete: 'hard',
    actions: [
      { label: 'Activate', tone: 'good', kind: 'set', data: { status: 'ACTIVE' }, when: { field: 'status', in: ['DRAFT', 'PAUSED', 'ENDED'] } },
      { label: 'Pause', tone: 'neutral', kind: 'set', data: { status: 'PAUSED' }, when: { field: 'status', in: ['ACTIVE'] } },
      { label: 'End', tone: 'bad', kind: 'set', data: { status: 'ENDED' }, when: { field: 'status', in: ['ACTIVE', 'PAUSED'] } },
    ],
  },
  disputes: {
    model: 'dispute', title: 'Disputes', description: 'Support tickets raised by users. Refunds go through the Resolve flow so wallets stay correct.',
    columns: [{ label: 'Type', path: 'type', kind: 'badge' }, { label: 'Reference', path: 'referenceId' }, { label: 'Description', path: 'description' }, { label: 'Raised', path: 'createdAt', kind: 'date' }, { label: 'Status', path: 'status', kind: 'badge' }],
    fields: [
      { key: 'status', label: 'Status', type: 'enum', options: ['OPEN', 'UNDER_REVIEW', 'RESOLVED_REFUND', 'RESOLVED_PAYOUT', 'RESOLVED_NO_ACTION', 'REJECTED'], filter: true },
      { key: 'resolutionNote', label: 'Resolution note', type: 'textarea' }, { key: 'description', label: 'Description', type: 'textarea', readonly: true }, { key: 'type', label: 'Type', type: 'text', readonly: true },
    ],
    search: ['description', 'referenceId'], orderBy: { createdAt: 'desc' }, delete: 'hard',
    actions: [
      { label: 'Start review', tone: 'neutral', kind: 'set', data: { status: 'UNDER_REVIEW' }, when: { field: 'status', in: ['OPEN'] } },
      { label: 'Close: no action', tone: 'neutral', kind: 'call', method: 'PATCH', url: '/disputes/admin/:id/resolve', body: { outcome: 'RESOLVED_NO_ACTION' }, prompt: { field: 'resolutionNote', label: 'Resolution note' }, when: { field: 'status', in: ['OPEN', 'UNDER_REVIEW'] } },
    ],
  },
  'commission-rules': {
    model: 'commissionRule', title: 'Commission rules', description: 'Per-category commission overrides. The global rates live in Config Engine.',
    columns: [{ label: 'Scope', path: 'scope', kind: 'badge' }, { label: 'Key', path: 'key' }, { label: 'Percentage', path: 'percentage' }, { label: 'Fixed fee', path: 'fixedFee', kind: 'money' }, { label: 'Active', path: 'active', kind: 'bool' }],
    fields: [
      { key: 'scope', label: 'Scope', type: 'enum', options: ['CONTEST', 'BOOKING', 'VOTING', 'CATEGORY'], required: true, filter: true, help: 'The global default is set in Config Engine' },
      { key: 'key', label: 'Key', type: 'text', required: true, help: 'For a category rule, the category name' },
      { key: 'percentage', label: 'Percentage', type: 'number', required: true }, { key: 'fixedFee', label: 'Fixed fee (₹)', type: 'number' }, { key: 'active', label: 'Active', type: 'bool', default: true },
    ],
    search: ['key'], orderBy: { createdAt: 'desc' }, allowCreate: true, delete: 'hard',
  },
  subscriptions: {
    model: 'subscription', title: 'Subscriptions', description: 'Grant, change or end a user\'s plan.',
    columns: [{ label: 'User', path: 'userId' }, { label: 'Plan', path: 'plan', kind: 'badge' }, { label: 'Status', path: 'status', kind: 'badge' }, { label: 'Started', path: 'startedAt', kind: 'date' }, { label: 'Expires', path: 'expiresAt', kind: 'date' }],
    fields: [
      { key: 'userId', label: 'User', type: 'relation', resource: 'users', required: true, createOnly: true },
      { key: 'plan', label: 'Plan', type: 'enum', options: ['FREE', 'PREMIUM', 'PRO'], required: true, filter: true, default: 'PREMIUM' },
      { key: 'status', label: 'Status', type: 'enum', options: ['ACTIVE', 'EXPIRED', 'CANCELLED'], filter: true, default: 'ACTIVE' },
      { key: 'expiresAt', label: 'Expires', type: 'datetime' }, { key: 'autoRenew', label: 'Auto renew', type: 'bool', default: false },
    ],
    search: [], orderBy: { startedAt: 'desc' }, allowCreate: true, delete: 'hard',
  },
  payments: {
    model: 'payment', title: 'Payments', description: 'Payment records are financial history, so they are view-only. Refunds go through Disputes.',
    columns: [{ label: 'Date', path: 'createdAt', kind: 'date' }, { label: 'Purpose', path: 'purpose', kind: 'badge' }, { label: 'Amount', path: 'amount', kind: 'money' }, { label: 'Razorpay ID', path: 'razorpayPaymentId' }, { label: 'Status', path: 'status', kind: 'badge' }],
    fields: [
      { key: 'purpose', label: 'Purpose', type: 'enum', options: ['CONTEST_REGISTRATION', 'VOTING', 'BOOKING_ADVANCE', 'BOOKING_BALANCE', 'SUBSCRIPTION', 'TIP', 'VOTE_PACK', 'OTHER'], readonly: true, filter: true },
      { key: 'status', label: 'Status', type: 'enum', options: ['INITIATED', 'PENDING', 'SUCCESSFUL', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED'], readonly: true, filter: true },
      { key: 'amount', label: 'Amount (₹)', type: 'number', readonly: true }, { key: 'razorpayOrderId', label: 'Order ID', type: 'text', readonly: true }, { key: 'razorpayPaymentId', label: 'Payment ID', type: 'text', readonly: true },
    ],
    search: ['razorpayPaymentId', 'razorpayOrderId'], orderBy: { createdAt: 'desc' }, delete: false,
  },
  kyc: {
    model: 'kyc', title: 'KYC records', description: 'All KYC submissions. Use the Queue tab to approve or reject pending ones so the user is notified.',
    columns: [{ label: 'User', path: 'user.name' }, { label: 'Mobile', path: 'user.mobile' }, { label: 'PAN', path: 'panNumber' }, { label: 'Submitted', path: 'submittedAt', kind: 'date' }, { label: 'Status', path: 'status', kind: 'badge' }],
    include: { user: { select: { name: true, mobile: true } } },
    fields: [
      { key: 'status', label: 'Status', type: 'enum', options: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'], filter: true, readonly: true },
      { key: 'panNumber', label: 'PAN', type: 'text', readonly: true }, { key: 'accountHolder', label: 'Account holder', type: 'text', readonly: true }, { key: 'ifsc', label: 'IFSC', type: 'text', readonly: true }, { key: 'rejectionNote', label: 'Rejection note', type: 'text', readonly: true },
    ],
    search: ['panNumber'], orderBy: { createdAt: 'desc' }, delete: false,
  },
  withdrawals: {
    model: 'withdrawalRequest', title: 'Withdrawals', description: 'All withdrawal requests. Use the Queue tab to pay or reject so wallets stay correct.',
    columns: [{ label: 'Requested', path: 'requestedAt', kind: 'date' }, { label: 'User', path: 'userId' }, { label: 'Amount', path: 'amount', kind: 'money' }, { label: 'Reference', path: 'payoutReference' }, { label: 'Status', path: 'status', kind: 'badge' }],
    fields: [
      { key: 'status', label: 'Status', type: 'enum', options: ['REQUESTED', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED', 'FAILED'], filter: true, readonly: true },
      { key: 'amount', label: 'Amount (₹)', type: 'number', readonly: true }, { key: 'payoutReference', label: 'Payout reference', type: 'text', readonly: true }, { key: 'rejectionNote', label: 'Rejection note', type: 'text', readonly: true },
    ],
    search: ['payoutReference'], orderBy: { requestedAt: 'desc' }, delete: false,
  },
};
