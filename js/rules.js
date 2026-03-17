// ============================================================
// LEASEGUARD - RED FLAG RULES ENGINE (40+ rules)
// ============================================================

const RULES = [

  // ================================================================
  // CATEGORY 1: HIDDEN FEES (9 rules)
  // ================================================================

  {
    id: "fee-application",
    category: "Hidden Fees",
    severity: "red",
    title: "Non-Refundable Application Fee",
    patterns: [
      /non[\s-]?refundable\s+(application|processing|administrative?)\s+fee/gi,
      /application\s+fee\s+of\s+\$[\d,.]+/gi,
      /\$[\d,.]+\s+(non[\s-]?refundable\s+)?application\s+fee/gi,
    ],
    explanation: "You may be required to pay before reviewing the actual lease terms. Many jurisdictions limit application fees or require itemized receipts. This fee is lost even if you decide not to sign.",
    tip: "Ask if the fee can be credited toward your first month's rent if approved. Check your local laws for caps on application fees."
  },
  {
    id: "fee-pet",
    category: "Hidden Fees",
    severity: "yellow",
    title: "Pet Fee or Pet Rent",
    patterns: [
      /pet\s+(fee|deposit|rent)\s+of\s+\$[\d,.]+/gi,
      /\$[\d,.]+\s+(monthly\s+)?pet\s+(fee|rent|deposit)/gi,
      /additional\s+(monthly\s+)?pet\s+(fee|rent)\b/gi,
    ],
    explanation: "Pet rent is a recurring monthly charge on top of any pet deposit. Unlike a deposit, pet rent is never returned. Clarify whether this is refundable and what it covers.",
    tip: "Negotiate for a one-time pet deposit instead of ongoing pet rent. Ask what damage the fee specifically covers."
  },
  {
    id: "fee-amenity",
    category: "Hidden Fees",
    severity: "yellow",
    title: "Mandatory Amenity Fee",
    patterns: [
      /amenity\s+fee\s+of\s+\$[\d,.]+/gi,
      /\$[\d,.]+\s+(monthly\s+)?amenity\s+fee/gi,
      /mandatory\s+amenity\s+(fee|charge|package)/gi,
    ],
    explanation: "Amenity fees are often mandatory even if you never use the amenities. This is essentially a hidden rent increase disguised as an optional service charge.",
    tip: "Calculate the total yearly cost of amenity fees and add it to your rent for a true monthly cost comparison."
  },
  {
    id: "fee-admin",
    category: "Hidden Fees",
    severity: "yellow",
    title: "Administrative or Processing Fee",
    patterns: [
      /(admin|administrative?|processing)\s+(fee|charge)\s+of\s+\$[\d,.]+/gi,
      /\$[\d,.]+\s+(admin|administrative?|processing)\s+(fee|charge)/gi,
      /one[\s-]?time\s+(admin|administrative?)\s+(fee|charge)/gi,
    ],
    explanation: "Admin fees are often vaguely described and may cover costs already included in rent. Ask for an itemized breakdown of what this fee specifically covers.",
    tip: "Request a written explanation of exactly what services this fee pays for."
  },
  {
    id: "fee-movein",
    category: "Hidden Fees",
    severity: "yellow",
    title: "Move-In/Move-Out Fee",
    patterns: [
      /move[\s-]?(in|out)\s+(fee|charge|inspection\s+fee)\s*(of\s+\$[\d,.]+)?/gi,
      /\$[\d,.]+\s+move[\s-]?(in|out)\s+(fee|charge)/gi,
    ],
    explanation: "Move-in and move-out fees are separate from security deposits and are typically non-refundable. These can add hundreds of dollars to your total moving costs.",
    tip: "Ask if the move-out fee can be waived if you leave the unit in excellent condition."
  },
  {
    id: "fee-trash",
    category: "Hidden Fees",
    severity: "info",
    title: "Trash or Utility Surcharge",
    patterns: [
      /trash\s+(removal\s+)?(fee|valet|charge)\s*(of\s+\$[\d,.]+)?/gi,
      /valet\s+trash\s*(fee|charge|service)?/gi,
      /\$[\d,.]+\s*(\/\s*mo(nth)?\s+)?(trash|waste)\s*(removal\s+)?(fee|charge|service)/gi,
    ],
    explanation: "Additional utility surcharges may not be included in quoted rent prices. Make sure you understand the full monthly cost beyond base rent.",
    tip: "Add all mandatory surcharges to the base rent to calculate your true monthly housing cost."
  },
  {
    id: "fee-parking",
    category: "Hidden Fees",
    severity: "info",
    title: "Parking Fee",
    patterns: [
      /parking\s+(fee|charge|rent)\s*(of\s+\$[\d,.]+)?/gi,
      /\$[\d,.]+\s*(\/\s*mo(nth)?\s+)?parking/gi,
      /reserved\s+parking\s*.*?\$[\d,.]+/gi,
    ],
    explanation: "Parking charges may be mandatory or may apply even if your unit includes a space. Verify whether parking is included or an additional cost.",
    tip: "Ask if free street parking is available nearby as an alternative."
  },
  {
    id: "fee-technology",
    category: "Hidden Fees",
    severity: "info",
    title: "Technology or Internet Package Fee",
    patterns: [
      /technology\s+(fee|package|charge)\s*(of\s+\$[\d,.]+)?/gi,
      /internet\s+(fee|package|charge)\s*(of\s+\$[\d,.]+)?/gi,
      /mandatory\s+(internet|wifi|cable|technology)\s*(fee|package|service)/gi,
      /\$[\d,.]+\s*(\/\s*mo(nth)?\s+)?(technology|internet|wifi|cable)\s*(fee|package)/gi,
    ],
    explanation: "Mandatory technology or internet fees lock you into a provider and price you cannot change. You may already have a cheaper internet plan.",
    tip: "Compare the bundled price with what you'd pay independently. Ask if you can opt out."
  },
  {
    id: "fee-cleaning",
    category: "Hidden Fees",
    severity: "yellow",
    title: "Mandatory Cleaning Fee",
    patterns: [
      /cleaning\s+fee\s*(of\s+\$[\d,.]+)?/gi,
      /\$[\d,.]+\s+cleaning\s+(fee|charge)/gi,
      /professional\s+cleaning\s+(required|charge|fee)/gi,
      /carpet\s+cleaning\s+(fee|charge|required)\s*(of\s+\$[\d,.]+)?/gi,
    ],
    explanation: "Some leases charge a non-refundable cleaning fee on top of the security deposit. This means you pay for cleaning regardless of how clean you leave the unit.",
    tip: "Check if your state allows mandatory cleaning fees separate from the security deposit."
  },

  // ================================================================
  // CATEGORY 2: PENALTY CLAUSES (8 rules)
  // ================================================================

  {
    id: "penalty-early-termination",
    category: "Penalty Clauses",
    severity: "red",
    title: "Early Termination Penalty",
    patterns: [
      /early\s+termination\s+(fee|penalty|charge)\s*(of\s+)?(equal\s+to\s+)?\$?[\d,.]+/gi,
      /\$[\d,.]+\s+early\s+termination/gi,
      /early\s+termination.*?(two|three|2|3)\s+months?[\s']?\s*rent/gi,
      /break(ing)?\s+(the\s+)?lease.*?\$[\d,.]+/gi,
    ],
    explanation: "Early termination fees can cost thousands of dollars. In many states, landlords must make reasonable efforts to re-rent the unit, which may reduce what you owe.",
    tip: "Know your state's mitigation laws. Many states require landlords to actively try to re-rent, reducing your liability."
  },
  {
    id: "penalty-late",
    category: "Penalty Clauses",
    severity: "yellow",
    title: "Late Payment Penalty",
    patterns: [
      /late\s+(payment\s+)?(fee|charge|penalty)\s*(of\s+)?\$[\d,.]+/gi,
      /\$[\d,.]+\s+late\s+(payment\s+)?(fee|charge|penalty)/gi,
      /late\s+fee.*?(\d+%|percent)/gi,
      /rent\s+(is\s+)?late\s+after\s+the\s+(\d+)(st|nd|rd|th)/gi,
    ],
    explanation: "Some leases impose excessive late fees or very short grace periods. Many states cap late fees at a percentage of rent (often 5-10%).",
    tip: "Check your state's maximum allowed late fee. If the lease exceeds it, the excess is unenforceable."
  },
  {
    id: "penalty-noise",
    category: "Penalty Clauses",
    severity: "yellow",
    title: "Noise Complaint Penalty",
    patterns: [
      /noise\s+(complaint|violation).*?(fee|fine|penalty|charge|\$[\d,.]+)/gi,
      /\$[\d,.]+.*?noise\s+(complaint|violation)/gi,
      /quiet\s+hours?.*?(fee|fine|penalty|\$)/gi,
    ],
    explanation: "Financial penalties for noise complaints can be subjective and difficult to contest. Understand what constitutes a violation and whether there is a formal complaint process.",
    tip: "Ask for a written noise policy with clear definitions of violations and a dispute process."
  },
  {
    id: "penalty-autorenewal",
    category: "Penalty Clauses",
    severity: "yellow",
    title: "Automatic Renewal Clause",
    patterns: [
      /automatic(ally)?\s+renew/gi,
      /auto[\s-]?renewal/gi,
      /lease\s+(shall|will)\s+(automatically\s+)?renew/gi,
      /convert\s+to\s+(a\s+)?month[\s-]to[\s-]month/gi,
    ],
    explanation: "Auto-renewal clauses may lock you into another full lease term if you miss the notice window. Mark your calendar for the required notice date.",
    tip: "Set a calendar reminder 30 days before the notice deadline so you don't accidentally renew."
  },
  {
    id: "penalty-extended-notice",
    category: "Penalty Clauses",
    severity: "yellow",
    title: "Extended Notice Period Required",
    patterns: [
      /(60|90|120)[\s-]?day(s)?\s+(written\s+)?notice\s+(to\s+vacate|required|prior|before)/gi,
      /notice\s+(to\s+vacate|of\s+(non[\s-]?renewal|intent)).*?(60|90|120)\s+days?/gi,
    ],
    explanation: "Notice periods longer than 30 days are common but can catch renters off guard. Missing this deadline could trigger automatic renewal or month-to-month conversion at higher rates.",
    tip: "Write down the exact date by which you must give notice, and set multiple reminders."
  },
  {
    id: "penalty-daily-latefee",
    category: "Penalty Clauses",
    severity: "red",
    title: "Compounding Daily Late Fees",
    patterns: [
      /\$[\d,.]+\s+(per|each|every)\s+day\s*(rent\s+)?(remain|unpaid|late|past\s+due)/gi,
      /(per|each|every)\s+day\s*(that\s+)?(rent\s+)?(remains?\s+)?(unpaid|late|past\s+due).*?\$[\d,.]+/gi,
      /additional\s+\$[\d,.]+\s+(per|each)\s+day/gi,
    ],
    explanation: "Daily late fees can compound rapidly, turning a minor delay into hundreds of dollars. Many states prohibit excessive or compounding late fees.",
    tip: "Calculate what 30 days of compounding would cost. If it exceeds your state's limits, negotiate removal."
  },
  {
    id: "penalty-rent-increase",
    category: "Penalty Clauses",
    severity: "yellow",
    title: "Uncapped Rent Increase on Renewal",
    patterns: [
      /(then[\s-]?)?current\s+market\s+rate/gi,
      /rent\s+(may|shall|will)\s+(be\s+)?(increase|adjust|raise)/gi,
      /increase.*?rent.*?(any\s+amount|without\s+limit|at\s+(landlord|management)('?s)?\s+(sole\s+)?discretion)/gi,
    ],
    explanation: "Vague language about rent increases at 'market rate' or 'landlord's discretion' gives you no predictability. You could face a large increase at renewal.",
    tip: "Try to negotiate a cap on annual rent increases (e.g., 3-5%) written into the lease."
  },
  {
    id: "penalty-eviction-speed",
    category: "Penalty Clauses",
    severity: "red",
    title: "Accelerated Eviction Timeline",
    patterns: [
      /eviction\s+(proceedings?|process|action)\s*(after|within|if)\s*\d+\s*days?/gi,
      /begin\s+eviction\s+after\s+\d+\s+days?/gi,
      /immediate\s+eviction/gi,
      /right\s+to\s+(immediate(ly)?\s+)?evict/gi,
    ],
    explanation: "Clauses that threaten rapid eviction may not reflect your actual legal rights. Most states require formal notice and court proceedings before eviction.",
    tip: "Know your state's eviction timeline. Landlords cannot bypass the legal process regardless of what the lease says."
  },

  // ================================================================
  // CATEGORY 3: LIABILITY TRAPS (8 rules)
  // ================================================================

  {
    id: "liability-cosigner",
    category: "Liability Traps",
    severity: "red",
    title: "Co-Signer / Joint and Several Liability",
    patterns: [
      /co[\s-]?sign(er|or).*?(liable|responsible|obligat)/gi,
      /(jointly\s+and\s+severally|joint\s+and\s+several)\s+liab(le|ility)/gi,
      /guarantor.*?(full|entire|total)\s+(amount|balance|rent)/gi,
    ],
    explanation: "Joint and several liability means each person on the lease is responsible for the ENTIRE rent, not just their share. If a roommate stops paying, you could be liable for their portion.",
    tip: "If you have roommates, consider separate leases or a written roommate agreement about splitting costs."
  },
  {
    id: "liability-damage-broad",
    category: "Liability Traps",
    severity: "yellow",
    title: "Broad Damage Liability",
    patterns: [
      /tenant\s+(shall\s+be\s+|is\s+)?(liable|responsible)\s+for\s+(all|any)\s+damage/gi,
      /responsible\s+for\s+(all\s+)?damage.*?(regardless|whether\s+or\s+not)/gi,
      /damage\s+beyond\s+normal\s+wear\s+and\s+tear/gi,
    ],
    explanation: "Vague damage clauses can be used to charge for pre-existing conditions or normal wear and tear. Document everything with photos and a written move-in checklist.",
    tip: "Take timestamped photos of every room before moving in. Email them to your landlord to create a paper trail."
  },
  {
    id: "liability-indemnification",
    category: "Liability Traps",
    severity: "red",
    title: "Landlord Liability Waiver / Indemnification",
    patterns: [
      /landlord\s+(shall\s+)?(not\s+be|is\s+not)\s+(liable|responsible)\s+for/gi,
      /hold\s+harmless/gi,
      /indemnif(y|ication).*?(landlord|management|owner)/gi,
      /waive.*?(right|claim).*?(landlord|management)/gi,
    ],
    explanation: "Clauses requiring you to indemnify the landlord or waive their liability can leave you responsible for injuries or damages caused by the landlord's own negligence. Many such waivers are unenforceable.",
    tip: "In most states, landlords cannot waive liability for their own negligence. These clauses may be void, but consult an attorney."
  },
  {
    id: "liability-insurance",
    category: "Liability Traps",
    severity: "info",
    title: "Mandatory Renter's Insurance",
    patterns: [
      /renter('?s)?\s+insurance\s+(is\s+)?required/gi,
      /maintain\s+(a\s+)?renter('?s)?\s+insurance/gi,
      /proof\s+of\s+(renter('?s)?|liability)\s+insurance/gi,
      /minimum.*?\$[\d,.]+.*?(renter|liability)\s+insurance/gi,
    ],
    explanation: "While renter's insurance is generally a good idea, mandatory policies with high minimums or required providers may cost more than necessary.",
    tip: "Shop around -- renter's insurance can be as low as $10-15/month. You usually do not have to use the landlord's preferred provider."
  },
  {
    id: "liability-sole-discretion",
    category: "Liability Traps",
    severity: "red",
    title: "Landlord's Sole Discretion Clause",
    patterns: [
      /(landlord|management|owner)('?s)?\s+sole\s+discretion/gi,
      /at\s+(the\s+)?(landlord|management|owner)('?s)?\s+(sole\s+)?discretion/gi,
      /determined\s+(solely\s+)?by\s+(the\s+)?(landlord|management)/gi,
    ],
    explanation: "When a landlord has 'sole discretion' over charges, deductions, or decisions, you have no objective standard to contest unfair treatment. This is a one-sided power imbalance.",
    tip: "Ask for objective criteria to replace 'sole discretion' language. For example, damage assessments should reference a move-in checklist."
  },
  {
    id: "liability-mold",
    category: "Liability Traps",
    severity: "red",
    title: "Mold / Environmental Liability Shift",
    patterns: [
      /tenant\s+(is\s+|shall\s+be\s+)?(responsible|liable)\s+for\s+(any\s+)?(mold|mildew)/gi,
      /mold\s+(prevention|remediation).*?tenant('?s)?\s+(responsibility|obligation)/gi,
      /landlord\s+(is\s+)?not\s+(responsible|liable)\s+for\s+(any\s+)?(mold|mildew)/gi,
    ],
    explanation: "Shifting mold liability to tenants is problematic because mold often results from building defects (leaks, poor ventilation) outside your control. You should not be responsible for structural issues.",
    tip: "Document any signs of moisture or mold at move-in. Report issues immediately in writing to protect yourself."
  },
  {
    id: "liability-legal-fees",
    category: "Liability Traps",
    severity: "yellow",
    title: "Tenant Pays All Legal Fees",
    patterns: [
      /tenant\s+(shall|will|agrees?\s+to)\s+(pay|be\s+(responsible|liable)\s+for)\s+(all\s+)?(attorney|legal|court)\s+(fee|cost)/gi,
      /(attorney|legal)\s+(fee|cost).*?tenant('?s)?\s+(expense|responsibility|obligation)/gi,
      /responsible\s+for\s+(all\s+)?(landlord|management)('?s)?\s+(attorney|legal)\s+fee/gi,
    ],
    explanation: "One-sided legal fee clauses mean you pay the landlord's attorney fees even if the dispute was the landlord's fault. Fair leases have mutual fee-shifting or no fee clause at all.",
    tip: "Request a mutual attorney fee clause: whoever loses a dispute pays the other side's legal costs."
  },
  {
    id: "liability-abandonment",
    category: "Liability Traps",
    severity: "yellow",
    title: "Abandonment Clause with Short Timeline",
    patterns: [
      /(deem|consider)(ed)?\s+(the\s+)?(premises|unit|apartment)\s+(to\s+be\s+)?abandon/gi,
      /abandon(ment|ed).*?(\d+)\s+days?/gi,
      /absence\s+of\s+(\d+)\s+days?.*?abandon/gi,
      /property.*?(dispose|discard|remove).*?abandon/gi,
    ],
    explanation: "Short abandonment timelines (e.g., 7-14 days) mean the landlord could declare your unit abandoned and dispose of your belongings if you travel or are hospitalized.",
    tip: "Notify your landlord in writing before any extended absence. Know your state's minimum abandonment timeline."
  },

  // ================================================================
  // CATEGORY 4: MISSING PROTECTIONS (7 rules)
  // ================================================================

  {
    id: "missing-deposit-return",
    category: "Missing Protections",
    severity: "red",
    title: "No Security Deposit Return Timeline",
    patterns: [/MISSING_PROTECTION_SECURITY_DEPOSIT/],
    explanation: "Most states require landlords to return security deposits within 14-60 days. Without a stated timeline, you may face indefinite delays. Your state law likely provides a default, but having it in writing is important.",
    tip: "Ask for the return timeline in writing before signing. Send a certified letter requesting your deposit after moving out.",
    missingCheck: function(text) {
      const hasDeposit = /security\s+deposit/i.test(text);
      const hasReturn = /(return|refund).{0,80}(security\s+deposit|deposit.{0,30}(within|\d+\s+days?))/i.test(text)
        || /security\s+deposit.{0,80}(return|refund|within|\d+\s+days?)/i.test(text);
      return hasDeposit && !hasReturn;
    }
  },
  {
    id: "missing-maintenance-sla",
    category: "Missing Protections",
    severity: "red",
    title: "No Maintenance Response SLA",
    patterns: [/MISSING_PROTECTION_MAINTENANCE/],
    explanation: "Without a defined response time for maintenance requests (especially emergencies), you have no leverage when repairs are delayed. Best practice is 24-48 hours for non-emergencies and immediate for emergencies.",
    tip: "Request that the lease specify response times: 4 hours for emergencies, 48 hours for routine requests.",
    missingCheck: function(text) {
      const hasMaintenance = /maintenance|repair/i.test(text);
      const hasSLA = /(maintenance|repair).{0,120}(\d+\s*(hours?|days?|business\s+days?)|promptly|reasonable\s+time|within)/i.test(text)
        || /(within|response|respond).{0,60}(maintenance|repair)/i.test(text);
      return hasMaintenance && !hasSLA;
    }
  },
  {
    id: "missing-entry-notice",
    category: "Missing Protections",
    severity: "yellow",
    title: "No Entry Notice Requirement",
    patterns: [/MISSING_PROTECTION_ENTRY_NOTICE/],
    explanation: "Most states require 24-48 hours notice before a landlord can enter your unit. If the lease doesn't specify this, your state law still applies, but having it in writing prevents disputes.",
    tip: "Request that the lease specify at least 24 hours written notice before any non-emergency entry.",
    missingCheck: function(text) {
      const mentionsEntry = /(right\s+to\s+enter|landlord.{0,30}enter|access\s+to\s+(the\s+)?(unit|premises|apartment))/i.test(text);
      const hasNotice = /(notice|notify|notif).{0,60}(enter|entry|access|inspection)/i.test(text)
        || /(enter|entry|access).{0,60}(notice|\d+\s*hours?)/i.test(text)
        || /\d+\s*hours?\s*(advance\s+)?(notice|prior)/i.test(text);
      return mentionsEntry && !hasNotice;
    }
  },
  {
    id: "missing-movein-checklist",
    category: "Missing Protections",
    severity: "yellow",
    title: "No Move-In Condition Checklist",
    patterns: [/MISSING_PROTECTION_MOVEIN_CHECKLIST/],
    explanation: "Without a documented move-in inspection, you risk being charged for pre-existing damage when you move out. Request a written walkthrough checklist and take dated photos.",
    tip: "Create your own checklist with photos and email it to your landlord within 48 hours of moving in.",
    missingCheck: function(text) {
      const hasChecklist = /(move[\s-]?in|check[\s-]?in).{0,60}(checklist|inspection|condition|report|walk[\s-]?through)/i.test(text)
        || /condition\s+(report|checklist|inspection)/i.test(text);
      return !hasChecklist && text.length > 200;
    }
  },
  {
    id: "missing-lead-paint",
    category: "Missing Protections",
    severity: "yellow",
    title: "No Lead Paint Disclosure",
    patterns: [/MISSING_PROTECTION_LEAD_PAINT/],
    explanation: "Federal law requires landlords of pre-1978 buildings to disclose known lead paint hazards. If the lease mentions the building's age but has no lead paint disclosure, this may be a legal violation.",
    tip: "Ask your landlord directly about lead paint. If the building was built before 1978, a disclosure is legally required.",
    missingCheck: function(text) {
      const isOlderBuilding = /(built|construct|year).{0,30}(19[0-7]\d)/i.test(text)
        || /pre[\s-]?(1978|war)/i.test(text);
      const hasDisclosure = /lead[\s-]?(based\s+)?paint/i.test(text);
      return isOlderBuilding && !hasDisclosure;
    }
  },
  {
    id: "missing-habitability",
    category: "Missing Protections",
    severity: "info",
    title: "No Habitability Standards Referenced",
    patterns: [/MISSING_PROTECTION_HABITABILITY/],
    explanation: "While implied warranty of habitability exists in most states regardless, a lease that explicitly references habitability standards shows the landlord is committed to maintaining the property.",
    tip: "Research your state's implied warranty of habitability. You have these rights even if the lease is silent.",
    missingCheck: function(text) {
      const hasHabitability = /habitab(le|ility)|building\s+code|health\s+and\s+safety|fit\s+for\s+(human\s+)?habitation/i.test(text);
      return !hasHabitability && text.length > 500;
    }
  },
  {
    id: "missing-deposit-itemization",
    category: "Missing Protections",
    severity: "yellow",
    title: "No Deposit Deduction Itemization Requirement",
    patterns: [/MISSING_PROTECTION_DEPOSIT_ITEMIZATION/],
    explanation: "Without a clause requiring itemized deductions from your security deposit, the landlord could make vague claims about damages. Most states require itemized statements by law.",
    tip: "Request an itemized list of any deductions with receipts. This is required by law in most states.",
    missingCheck: function(text) {
      const hasDeposit = /security\s+deposit/i.test(text);
      const hasItemization = /(itemiz|detail|specific).{0,40}(deduction|charge|withhold)/i.test(text)
        || /deduction.{0,40}(itemiz|detail|list|statement)/i.test(text);
      return hasDeposit && !hasItemization;
    }
  },

  // ================================================================
  // CATEGORY 5: UNUSUAL RESTRICTIONS (8 rules)
  // ================================================================

  {
    id: "restrict-guests",
    category: "Unusual Restrictions",
    severity: "yellow",
    title: "Guest Restrictions",
    patterns: [
      /guest(s)?\s+(may\s+not|shall\s+not|cannot|are\s+not\s+(permitted|allowed)).{0,40}(more\s+than|exceed|\d+)/gi,
      /(no\s+)?guest(s)?\s+(for\s+)?more\s+than\s+\d+\s+(consecutive\s+)?(night|day)/gi,
      /overnight\s+guest(s)?\s+(limit|restrict|polic)/gi,
      /guest(s)?\s+must\s+(be\s+)?(register|approved|report)/gi,
    ],
    explanation: "Strict guest policies may limit how often friends or family can visit or stay overnight. Excessive restrictions could interfere with your right to quiet enjoyment.",
    tip: "Check if guest registration is practical for your lifestyle. Negotiate longer guest periods if needed."
  },
  {
    id: "restrict-subletting",
    category: "Unusual Restrictions",
    severity: "yellow",
    title: "Subletting Ban",
    patterns: [
      /sublet(ting)?\s+(is\s+)?(not\s+permitted|prohibited|not\s+allowed|strictly\s+prohibited)/gi,
      /no\s+sublet(ting)?/gi,
      /(shall|may)\s+not\s+sublet/gi,
      /assignment\s+(of\s+(this\s+)?lease\s+)?(is\s+)?(not\s+permitted|prohibited)/gi,
    ],
    explanation: "A strict no-subletting clause means you cannot transfer the lease if your circumstances change. This can trap you in a lease you cannot afford.",
    tip: "Some states allow subletting regardless of lease terms. Check your local laws."
  },
  {
    id: "restrict-parking-tow",
    category: "Unusual Restrictions",
    severity: "info",
    title: "Parking Restrictions and Towing",
    patterns: [
      /parking.{0,60}(tow|towed|boot)/gi,
      /unauthorized\s+(vehicle|parking).*?(tow|fine|\$)/gi,
      /vehicle.{0,40}(register|permit|decal|sticker)\s+(required|must|shall)/gi,
    ],
    explanation: "Aggressive towing policies and vehicle registration requirements can lead to unexpected costs. Make sure you understand the rules for visitors' parking as well.",
    tip: "Register your vehicles immediately and inform guests about parking rules to avoid towing."
  },
  {
    id: "restrict-decoration",
    category: "Unusual Restrictions",
    severity: "info",
    title: "Decoration or Exterior Restrictions",
    patterns: [
      /(no|prohibit|restrict).{0,30}(satellite\s+dish|antenna|flag|sign|decoration)/gi,
      /(balcony|patio|exterior).{0,60}(no|prohibit|restrict).{0,30}(item|object|decoration|grill)/gi,
    ],
    explanation: "Restrictions on satellite dishes may violate FCC rules. Exterior decoration bans should be reasonable. Review what is and is not permitted.",
    tip: "FCC rules protect your right to install small satellite dishes. Know which restrictions are legally enforceable."
  },
  {
    id: "restrict-arbitration",
    category: "Unusual Restrictions",
    severity: "red",
    title: "Mandatory Arbitration / Jury Waiver",
    patterns: [
      /waive.*?(right\s+to\s+)?jury\s+trial/gi,
      /binding\s+arbitration/gi,
      /mandatory\s+arbitration/gi,
      /agree\s+to\s+arbitrat/gi,
    ],
    explanation: "Waiving your right to a jury trial or agreeing to mandatory arbitration limits your legal options. Arbitration often favors repeat players (landlords).",
    tip: "This clause may be unenforceable in your jurisdiction. Consult a tenant rights attorney."
  },
  {
    id: "restrict-modification",
    category: "Unusual Restrictions",
    severity: "info",
    title: "No Modifications Allowed",
    patterns: [
      /(no|shall\s+not|may\s+not|prohibit).{0,30}(modification|alteration|change|paint|nail|hole|hang)/gi,
      /(modification|alteration).{0,30}(not\s+permitted|prohibited|not\s+allowed|without\s+(prior\s+)?consent)/gi,
    ],
    explanation: "Strict no-modification clauses may prevent you from hanging pictures, painting walls, or making minor changes that make the space feel like home.",
    tip: "Ask about specific modifications you plan to make. Many landlords allow nail holes if patched before move-out."
  },
  {
    id: "restrict-business",
    category: "Unusual Restrictions",
    severity: "info",
    title: "Home Business Prohibition",
    patterns: [
      /(no|prohibit|restrict).{0,20}(business|commercial)\s+(use|activity|purpose|operation)/gi,
      /residential\s+(use|purpose)\s+only/gi,
      /(shall|may)\s+not\s+(be\s+used|operate|conduct).{0,30}(business|commercial)/gi,
    ],
    explanation: "If you work from home or run a side business, a strict residential-use-only clause could be problematic. Remote work may technically violate this clause.",
    tip: "Clarify whether working from home or running an online business is considered a 'business use' under this clause."
  },
  {
    id: "restrict-smoking",
    category: "Unusual Restrictions",
    severity: "info",
    title: "Smoking Ban with Heavy Penalties",
    patterns: [
      /smoking.*?(fee|fine|penalty|charge|\$[\d,.]+)/gi,
      /\$[\d,.]+.*?smoking\s+(violation|fee|fine|penalty)/gi,
      /smoking\s+(violation|breach).*?(terminat|evict)/gi,
    ],
    explanation: "While smoking bans are common and generally enforceable, associated fines can be steep. Understand what counts as a violation and how it is detected.",
    tip: "Clarify whether this includes vaping, balcony use, or only indoor smoking."
  },

  // ================================================================
  // CATEGORY 6: RENT & PAYMENT TERMS (5 rules)
  // ================================================================

  {
    id: "rent-payment-method",
    category: "Rent & Payment Terms",
    severity: "yellow",
    title: "Restricted Payment Methods",
    patterns: [
      /(only|must|shall)\s+(pay|accept|be\s+paid).{0,30}(certified\s+check|cashier.?s\s+check|money\s+order)/gi,
      /cash\s+(only|payments?\s+only)/gi,
      /no\s+personal\s+checks?/gi,
      /electronic\s+payment\s+(required|mandatory|only)/gi,
    ],
    explanation: "Requiring specific payment methods like money orders or cashier's checks can be inconvenient and add extra costs. Paying rent in cash with no receipt is risky.",
    tip: "Always get a written receipt for rent payments, regardless of payment method."
  },
  {
    id: "rent-proration",
    category: "Rent & Payment Terms",
    severity: "info",
    title: "No Rent Proration for Partial Months",
    patterns: [
      /no\s+(pro[\s-]?rat|partial\s+month)/gi,
      /full\s+month.{0,30}(rent|payment).{0,30}(regardless|even\s+if|irrespective)/gi,
      /first\s+month.{0,30}(full|entire)\s+(month|rent)/gi,
    ],
    explanation: "If you move in mid-month, you should only pay for the days you occupy the unit. Without proration, you may pay for a full month while only living there for a few days.",
    tip: "Negotiate prorated rent for your first and last months if they are partial."
  },
  {
    id: "rent-returned-check",
    category: "Rent & Payment Terms",
    severity: "yellow",
    title: "Excessive Returned Check Fee",
    patterns: [
      /(returned|bounced|nsf|dishonored)\s+(check|payment)\s+(fee|charge|penalty)\s*(of\s+)?\$[\d,.]+/gi,
      /\$[\d,.]+\s+(returned|bounced|nsf|dishonored)\s+(check|payment)\s+(fee|charge)/gi,
      /(insufficient\s+funds?|nsf)\s+(fee|charge)\s*(of\s+)?\$[\d,.]+/gi,
    ],
    explanation: "Returned check fees above $25-50 may be excessive and potentially unenforceable. Some states cap these fees.",
    tip: "Set up autopay to avoid returned check fees entirely."
  },
  {
    id: "rent-acceleration",
    category: "Rent & Payment Terms",
    severity: "red",
    title: "Rent Acceleration Clause",
    patterns: [
      /acceleration\s+(of\s+)?(rent|payment)/gi,
      /entire\s+(remaining\s+)?(balance|rent)\s+(of\s+the\s+lease\s+)?(becomes?\s+)?(due|payable)/gi,
      /all\s+(remaining\s+)?rent.*?(immediately\s+)?(due|payable|owe)/gi,
    ],
    explanation: "A rent acceleration clause means if you default, the entire remaining rent for the lease term becomes due immediately. On a 12-month lease, one missed payment could trigger a demand for thousands.",
    tip: "Many states have limited or banned rent acceleration clauses. Check your local tenant protection laws."
  },
  {
    id: "rent-utility-responsibility",
    category: "Rent & Payment Terms",
    severity: "info",
    title: "Unclear Utility Responsibility",
    patterns: [
      /tenant\s+(is\s+|shall\s+be\s+)?responsible\s+for\s+(all\s+)?utilit/gi,
      /utilit(y|ies)\s+(not\s+included|tenant('?s)?\s+(responsibility|expense))/gi,
      /tenant\s+(shall|will|agrees?\s+to)\s+pay\s+(all\s+)?(utility|utilit)/gi,
    ],
    explanation: "Make sure you understand exactly which utilities you are responsible for. Heating costs in particular can vary dramatically by season.",
    tip: "Ask the landlord for average monthly utility costs from previous tenants before signing."
  },
];

// ============================================================
// CATEGORY METADATA
// ============================================================

const CATEGORY_META = {
  "Hidden Fees": {
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    color: "var(--yellow)",
    bg: "var(--yellow-bg)",
  },
  "Penalty Clauses": {
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    color: "var(--red)",
    bg: "var(--red-bg)",
  },
  "Liability Traps": {
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    color: "var(--yellow)",
    bg: "var(--yellow-bg)",
  },
  "Missing Protections": {
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    color: "var(--blue)",
    bg: "var(--blue-bg)",
  },
  "Unusual Restrictions": {
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    color: "var(--text-secondary)",
    bg: "var(--bg-elevated)",
  },
  "Rent & Payment Terms": {
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    color: "var(--accent)",
    bg: "var(--accent-glow)",
  },
};

const CATEGORY_ORDER = [
  "Hidden Fees",
  "Penalty Clauses",
  "Liability Traps",
  "Missing Protections",
  "Unusual Restrictions",
  "Rent & Payment Terms",
];
