/**
 * Multi-Vertical AI Templates
 *
 * Each vertical defines:
 * - Industry-specific reply scenarios
 * - Fact-check rules relevant to that business type
 * - Tone guidelines
 * - Default tags for the QR survey flow
 */

export type BusinessVertical =
  | 'restaurant'
  | 'medical'
  | 'hotel'
  | 'auto_repair'
  | 'salon'
  | 'retail'
  | 'fitness'
  | 'other';

export interface VerticalConfig {
  id: BusinessVertical;
  label: string;
  labelZh: string;
  icon: string;
  /** Scenario-based reply scripts appended to the base handbook */
  replyScenarios: string;
  /** Store facts template (what info the AI can reference) */
  factsTemplate: string[];
  /** Default positive tags for QR survey */
  defaultTagsEn: string[];
  defaultTagsZh: string[];
}

export const VERTICALS: Record<BusinessVertical, VerticalConfig> = {
  restaurant: {
    id: 'restaurant',
    label: 'Restaurant / F&B',
    labelZh: '餐飲',
    icon: '🍽️',
    replyScenarios: `
**1. Hygiene & Cleanliness** (Keywords: Dirty, utensil, sauce bar, washroom)
*Fact Check*: If "washroom" mentioned, ensure "Has Restroom: Yes". If No, use Fact-Check Gate clarification.
Logic: "We're sorry to hear about the hygiene concerns. A clean environment is fundamental. We're reinforcing our cleaning checklist. Contact {{contact_email}}."

**2. Poor Dining Environment** (Keywords: Seat, crowded, loud, parking)
*Fact Check*: If "parking" mentioned, check "Has Parking".
Logic: "We're sorry the environment fell short. We'll be evaluating our layout and music levels. Contact {{contact_email}}."

**3. Wrong/Missing Item** (Keywords: Wrong order, missing, mistake, forgot item)
Logic: "We're very sorry that your order was incorrect or incomplete. Accuracy is a priority for us. Contact {{contact_email}}."

**4. Pricing Issues** (Keywords: Charge, bill, receipt, expensive, price)
Logic: "We apologize for any confusion or error with pricing. We're reviewing our billing procedures. Contact {{contact_email}}."

**5. Undesired Food (Flavor)** (Keywords: Salty, bland, spicy, taste, weird)
Logic: "We're truly sorry the flavors didn't meet your expectations. Contact {{contact_email}}."

**6. Long Wait (Table)** (Keywords: Queue, wait list, waiting, seated)
Logic: "We sincerely apologize for the long wait time. We're reviewing our seating processes. Contact {{contact_email}}."

**7. Long Wait (Food)** (Keywords: Slow service, food didn't come, hungry)
Logic: "We're very sorry your food took longer than expected. Contact {{contact_email}}."

**8. Poor Service** (Keywords: Rude, attitude, ignored, staff, waiter)
Logic: "We're truly sorry about the poor service. We'll be addressing this internally. Contact {{contact_email}}."

**9. Food Quality** (Keywords: Undercooked, overcooked, raw, cold food, freshness)
Logic: "We're sorry your dish didn't meet our usual standards. Contact {{contact_email}}."

**10. Foreign Objects** (Keywords: Hair, bug, plastic, fly)
Logic: "We are deeply sorry. We're conducting an immediate investigation. Contact {{contact_email}}."

**11. Food Safety (Illness)** (Keywords: Sick, vomit, diarrhea, poisoning)
CRITICAL: "Your health and safety are our highest priorities. Contact us immediately at {{contact_email}}."
`,
    factsTemplate: [
      'Dine-In', 'Takeout', 'Restroom', 'Sauce Bar', 'Parking',
      'Free Dessert', 'Happy Hour', 'Business Hours'
    ],
    defaultTagsEn: ['Signature Dish', 'Chef Special', 'Friendly Staff', 'Fast Service', 'Great Value'],
    defaultTagsZh: ['招牌餐點', '主廚推薦', '服務親切', '上菜快速', 'CP值高'],
  },

  medical: {
    id: 'medical',
    label: 'Medical / Dental / Clinic',
    labelZh: '醫療診所',
    icon: '🏥',
    replyScenarios: `
**1. Long Wait Time** (Keywords: Wait, hours, appointment delay, late)
Logic: "We apologize for the extended wait time during your visit. We understand how valuable your time is and are working to improve our scheduling system. Contact {{contact_email}}."

**2. Staff Bedside Manner** (Keywords: Cold, rude, rushed, didn't listen, dismissive)
Logic: "We're sorry to hear that you didn't feel heard during your visit. Compassionate care is central to our practice. We'll be reviewing this with our team. Contact {{contact_email}}."

**3. Billing / Insurance Issues** (Keywords: Bill, charge, insurance, expensive, copay, coverage)
Logic: "We apologize for any confusion with billing or insurance processing. Our billing team is available to help clarify charges. Contact {{contact_email}}."

**4. Treatment Concerns** (Keywords: Pain, side effects, didn't work, misdiagnosis, wrong treatment)
CRITICAL: "We take your treatment concerns very seriously. Patient outcomes are our top priority. Please contact us directly at {{contact_email}} so we can discuss your care."

**5. Facility Cleanliness** (Keywords: Dirty, unsanitary, old equipment, uncomfortable)
Logic: "We apologize for any cleanliness concerns. Maintaining a sterile, comfortable environment is essential. We're reinforcing our protocols. Contact {{contact_email}}."

**6. Appointment Scheduling** (Keywords: Can't get appointment, booked, unavailable, hard to schedule)
Logic: "We understand the frustration of scheduling difficulties. We're expanding our availability to serve you better. Contact {{contact_email}}."

**7. Communication Issues** (Keywords: Didn't explain, unclear, no follow-up, results)
Logic: "We're sorry for any communication gaps. Clear explanation of your care plan is important to us. Contact {{contact_email}}."

**HIPAA NOTE**: NEVER reference specific medical conditions, treatments, or test results in public replies. Keep responses general and invite private discussion.
`,
    factsTemplate: [
      'Walk-ins Accepted', 'Telehealth Available', 'Parking', 'Wheelchair Accessible',
      'Insurance Accepted', 'Evening/Weekend Hours', 'Multilingual Staff'
    ],
    defaultTagsEn: ['Professional Doctor', 'Caring Staff', 'Clean Facility', 'Short Wait', 'Clear Explanation'],
    defaultTagsZh: ['專業醫師', '親切護理', '環境整潔', '等候時間短', '詳細說明'],
  },

  hotel: {
    id: 'hotel',
    label: 'Hotel / Hospitality',
    labelZh: '旅館住宿',
    icon: '🏨',
    replyScenarios: `
**1. Room Cleanliness** (Keywords: Dirty, stains, bed bugs, hair, bathroom, sheets)
Logic: "We sincerely apologize for the cleanliness issues in your room. This is well below our standards, and we've addressed this with our housekeeping team. Contact {{contact_email}}."

**2. Noise Issues** (Keywords: Loud, noisy, neighbors, construction, thin walls)
Logic: "We're sorry the noise disrupted your stay. We understand a peaceful environment is essential for our guests. Contact {{contact_email}}."

**3. Check-in/Check-out Problems** (Keywords: Long check-in, early check-out, wait, lobby, front desk)
Logic: "We apologize for the inconvenience during check-in/check-out. We're reviewing our front desk procedures. Contact {{contact_email}}."

**4. Amenities Not Working** (Keywords: WiFi, AC, hot water, TV, pool, elevator, broken)
*Fact Check*: Verify amenity availability before responding.
Logic: "We're sorry that amenities didn't meet your expectations. We've reported this to our maintenance team. Contact {{contact_email}}."

**5. Staff Attitude** (Keywords: Rude, unhelpful, front desk, concierge, housekeeping)
Logic: "We're truly sorry about the service experience. Warm hospitality is our core value. Contact {{contact_email}}."

**6. Pricing / Hidden Charges** (Keywords: Expensive, resort fee, parking fee, minibar charge, overcharged)
Logic: "We apologize for any billing concerns. We strive for transparent pricing. Contact {{contact_email}} to review charges."

**7. Location / Misleading Description** (Keywords: Far, not as pictured, misleading, different from photos)
Logic: "We're sorry if our property didn't match expectations. We appreciate this feedback and will update our descriptions. Contact {{contact_email}}."

**8. Safety Concerns** (Keywords: Unsafe, lock, security, stolen, key card)
CRITICAL: "Guest safety is our absolute top priority. We take this very seriously and have escalated this matter. Please contact us immediately at {{contact_email}}."
`,
    factsTemplate: [
      'Free WiFi', 'Pool', 'Gym', 'Free Breakfast', 'Parking',
      'Airport Shuttle', '24h Front Desk', 'Room Service'
    ],
    defaultTagsEn: ['Comfortable Room', 'Great Location', 'Friendly Staff', 'Clean', 'Good Breakfast'],
    defaultTagsZh: ['房間舒適', '位置絕佳', '服務親切', '環境整潔', '早餐豐富'],
  },

  auto_repair: {
    id: 'auto_repair',
    label: 'Auto Repair / Service',
    labelZh: '汽車維修',
    icon: '🔧',
    replyScenarios: `
**1. Overcharging** (Keywords: Expensive, rip off, overcharged, markup, quote vs bill)
Logic: "We're sorry for any pricing concerns. We strive for transparent, fair estimates. We'd like to review your invoice. Contact {{contact_email}}."

**2. Repair Not Fixed** (Keywords: Still broken, same problem, came back, didn't fix, recurring issue)
Logic: "We apologize that the issue persists. Standing behind our work is fundamental. Please bring your vehicle back for a follow-up at no additional charge. Contact {{contact_email}}."

**3. Long Service Time** (Keywords: Took too long, delayed, days, waiting, not ready)
Logic: "We understand the inconvenience of extended service times and apologize for the delay. Contact {{contact_email}}."

**4. Misdiagnosis** (Keywords: Wrong diagnosis, unnecessary repair, didn't need, upsell)
Logic: "We take diagnostic accuracy very seriously. We'd like to review your service with you. Contact {{contact_email}}."

**5. Damage to Vehicle** (Keywords: Scratched, dent, damaged, broken, stain, missing)
CRITICAL: "We sincerely apologize if your vehicle was damaged while in our care. Please contact us immediately at {{contact_email}} so we can resolve this."

**6. Poor Communication** (Keywords: Didn't call, no update, surprised by cost, didn't explain)
Logic: "We apologize for the communication gap. Keeping customers informed throughout the repair process is a priority. Contact {{contact_email}}."

**7. Staff Attitude** (Keywords: Rude, condescending, dismissive, mechanic)
Logic: "We're sorry about your experience with our team. Professional, respectful service is expected. Contact {{contact_email}}."
`,
    factsTemplate: [
      'Loaner Cars Available', 'Shuttle Service', 'Waiting Room',
      'Free Estimates', 'Warranty on Parts', 'Certified Mechanics'
    ],
    defaultTagsEn: ['Honest Pricing', 'Quick Turnaround', 'Skilled Mechanics', 'Good Communication', 'Clean Shop'],
    defaultTagsZh: ['價格透明', '維修快速', '技術專業', '溝通清楚', '環境整潔'],
  },

  salon: {
    id: 'salon',
    label: 'Salon / Spa / Beauty',
    labelZh: '美容美髮',
    icon: '💇',
    replyScenarios: `
**1. Bad Haircut/Color** (Keywords: Too short, wrong color, not what I asked, butchered, uneven)
Logic: "We're sorry the result didn't match your expectations. We'd love to have you come back for a complimentary correction. Contact {{contact_email}}."

**2. Long Wait** (Keywords: Late, behind schedule, waited, appointment time)
Logic: "We apologize for the wait. We know your time is valuable and we're working on improving our scheduling. Contact {{contact_email}}."

**3. Rude Staff** (Keywords: Unfriendly, attitude, dismissive, rushed)
Logic: "We're sorry about your experience with our team. Creating a welcoming, relaxing environment is our goal. Contact {{contact_email}}."

**4. Pricing Issues** (Keywords: Expensive, hidden charge, more than quoted, upcharge)
Logic: "We apologize for any pricing confusion. We strive for transparent pricing. Contact {{contact_email}}."

**5. Hygiene Concerns** (Keywords: Dirty, tools, unsanitary, station, towels)
Logic: "We take hygiene and sanitation very seriously. We're reinforcing our sterilization protocols. Contact {{contact_email}}."

**6. Skin/Hair Damage** (Keywords: Burned, allergic, breakage, irritation, chemical)
CRITICAL: "We're deeply concerned to hear about this. Your safety is our top priority. Please contact us immediately at {{contact_email}}."
`,
    factsTemplate: [
      'Walk-ins Welcome', 'Parking', 'Online Booking', 'Product Sales',
      'Complimentary Beverages', 'Private Rooms'
    ],
    defaultTagsEn: ['Skilled Stylist', 'Relaxing Atmosphere', 'Great Results', 'Friendly Service', 'Good Value'],
    defaultTagsZh: ['技術好', '環境放鬆', '效果滿意', '服務親切', 'CP值高'],
  },

  retail: {
    id: 'retail',
    label: 'Retail / Shopping',
    labelZh: '零售商店',
    icon: '🛍️',
    replyScenarios: `
**1. Product Quality** (Keywords: Defective, broke, poor quality, not as described, fake)
Logic: "We're sorry about the product quality issue. We stand behind what we sell. Contact {{contact_email}} for a replacement or refund."

**2. Return/Exchange Issues** (Keywords: Won't accept return, refund, exchange, policy, receipt)
Logic: "We apologize for the difficulty with your return. We want to make this right. Contact {{contact_email}}."

**3. Rude Staff** (Keywords: Unfriendly, ignored, pushy, condescending, no help)
Logic: "We're sorry about your experience with our team. Helpful, courteous service is our standard. Contact {{contact_email}}."

**4. Pricing/Overcharge** (Keywords: Wrong price, overcharged, sale price, didn't ring up)
Logic: "We apologize for the pricing error. Contact {{contact_email}} and we'll correct this."

**5. Stock Issues** (Keywords: Out of stock, not available, empty shelves, can't find)
Logic: "We're sorry the item wasn't available. We're working to improve our inventory. Contact {{contact_email}}."

**6. Store Cleanliness** (Keywords: Messy, dirty, disorganized, cluttered)
Logic: "We apologize for the store condition. We're reinforcing our maintenance standards. Contact {{contact_email}}."
`,
    factsTemplate: [
      'Parking', 'Online Shopping', 'Delivery Available', 'Return Policy',
      'Loyalty Program', 'Gift Wrapping'
    ],
    defaultTagsEn: ['Great Selection', 'Helpful Staff', 'Good Prices', 'Clean Store', 'Easy Checkout'],
    defaultTagsZh: ['商品齊全', '服務親切', '價格合理', '環境整潔', '結帳快速'],
  },

  fitness: {
    id: 'fitness',
    label: 'Gym / Fitness',
    labelZh: '健身運動',
    icon: '💪',
    replyScenarios: `
**1. Equipment Issues** (Keywords: Broken, out of order, old, not maintained, dirty equipment)
Logic: "We apologize for the equipment issues. We're prioritizing maintenance and upgrades. Contact {{contact_email}}."

**2. Crowded/Busy** (Keywords: Too crowded, can't get machine, peak hours, wait for equipment)
Logic: "We understand the frustration during peak hours. We're looking at solutions to manage capacity. Contact {{contact_email}}."

**3. Cleanliness** (Keywords: Dirty, locker room, showers, smell, sweat, unsanitary)
Logic: "We apologize for the cleanliness concerns. We're increasing our cleaning frequency. Contact {{contact_email}}."

**4. Membership/Billing** (Keywords: Cancel, contract, hidden fees, overcharged, auto-renew)
Logic: "We're sorry for any billing or membership concerns. We strive for transparency. Contact {{contact_email}}."

**5. Staff/Trainer Issues** (Keywords: Unhelpful, rude, no-show, unqualified, pushy)
Logic: "We're sorry about your experience. Professional, supportive coaching is our standard. Contact {{contact_email}}."

**6. Safety Concerns** (Keywords: Injury, unsafe, no spotter, dangerous, accident)
CRITICAL: "Member safety is our top priority. We take this very seriously. Please contact us immediately at {{contact_email}}."
`,
    factsTemplate: [
      'Parking', 'Showers/Lockers', 'Personal Training', 'Group Classes',
      '24/7 Access', 'Sauna/Steam Room'
    ],
    defaultTagsEn: ['Great Equipment', 'Clean Facility', 'Helpful Trainers', 'Good Hours', 'Fair Pricing'],
    defaultTagsZh: ['器材齊全', '環境整潔', '教練專業', '營業時間好', '價格合理'],
  },

  other: {
    id: 'other',
    label: 'Other / General',
    labelZh: '其他',
    icon: '🏢',
    replyScenarios: `
**1. Poor Service** (Keywords: Rude, unhelpful, slow, ignored)
Logic: "We're sorry about your experience. Quality service is our priority. Contact {{contact_email}}."

**2. Quality Issues** (Keywords: Poor quality, defective, not as expected, disappointing)
Logic: "We apologize that we didn't meet your expectations. Contact {{contact_email}} so we can make it right."

**3. Pricing** (Keywords: Expensive, overcharged, hidden fees, not worth it)
Logic: "We're sorry for any pricing concerns. We strive for fair, transparent pricing. Contact {{contact_email}}."

**4. Wait Time** (Keywords: Long wait, slow, delayed)
Logic: "We apologize for the delay. We're working to improve our efficiency. Contact {{contact_email}}."

**5. Facility** (Keywords: Dirty, uncomfortable, parking, accessibility)
Logic: "We apologize for the facility concerns. We're addressing this. Contact {{contact_email}}."
`,
    factsTemplate: ['Parking', 'Business Hours', 'Online Booking', 'Walk-ins Welcome'],
    defaultTagsEn: ['Professional', 'Friendly', 'Good Value', 'Clean', 'Convenient'],
    defaultTagsZh: ['專業', '親切', 'CP值高', '整潔', '方便'],
  },
};

/**
 * Get the vertical config for a store.
 * Falls back to 'restaurant' if unknown.
 */
export function getVerticalConfig(vertical: string | null | undefined): VerticalConfig {
  return VERTICALS[(vertical as BusinessVertical)] || VERTICALS.restaurant;
}

/**
 * Get all verticals for display in settings UI.
 */
export function getVerticalOptions(): Array<{ id: string; label: string; labelZh: string; icon: string }> {
  return Object.values(VERTICALS).map(v => ({
    id: v.id,
    label: v.label,
    labelZh: v.labelZh,
    icon: v.icon,
  }));
}
