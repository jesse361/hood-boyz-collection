export const contentDefaults = {
  brand: {
    name: "HOOD BOYZ",
    legalName: "Hood Boyz Collection",
    tagline: "Not made to blend in.",
    description: "Streetwear for those who move differently.",
    email: "studio@hoodboyz.local",
    phone: "",
    address: "Accra, Ghana",
    logoText: "HOOD BOYZ",
    currency: "GHS",
  },
  announcement: {
    enabled: true,
    text: "NEW DROP AVAILABLE — SHOP THE LATEST COLLECTION.",
    link: "/new-arrivals",
  },
  hero: {
    headline: "NOT MADE TO BLEND IN.",
    supporting:
      "Streetwear for those who move differently. Discover distinctive pieces, expressive graphics and everyday essentials.",
    primaryCta: "SHOP THE COLLECTION",
    primaryHref: "/shop",
    secondaryCta: "EXPLORE THE BRAND",
    secondaryHref: "/about",
    image: "/products/monogram-black.webp",
    imageAlt: "Black oversized t-shirt with a large monogram graphic on the back.",
  },
  promo: {
    title: "THE COLLECTIVE CREW",
    body: "A heather grey sweatshirt with the full back mark and a small chest crest. Cut for a relaxed, contemporary fit.",
    message: "Sample pricing. Fibre content has not been confirmed.",
    discountLabel: "",
    cta: "VIEW THE PIECE",
    href: "/products/madehero-collective-sweatshirt",
    image: "/products/collective-sweat.jpg",
    imageAlt: "Heather grey sweatshirt with the MadeHero Collective back graphic.",
  },
  story: {
    heading: "A HOUSE, NOT A UNIFORM.",
    body: "Hood Boyz is a contemporary streetwear house for people who would rather be recognised than repeated. The edit brings graphic apparel, headwear and everyday pieces together with a premium, unhurried point of view. The graphics on these garments are shown as supplied. Hood Boyz does not claim to have designed marks that belong to other labels.",
    image: "/products/crest-sweat.jpg",
    imageAlt: "Heather grey sweatshirt with a small oval crest on the chest.",
  },
  newsletter: {
    heading: "THE NEXT DROP",
    body: "Join the list for new arrivals and private edits. No invented urgency. Unsubscribe whenever you want.",
  },
  social: {
    instagram: "",
    tiktok: "",
    facebook: "",
    pinterest: "",
  },
  commerce: {
    currency: "GHS",
    taxRatePercent: 0,
    pricesAreSamples: true,
    inventoryIsDemonstration: true,
    freeShippingThreshold: null as number | null,
    acceptOrders: true,
  },
  sizeGuide: {
    note: "This is a general oversized guide, not a measured specification for each garment. Confirm measurements before treating them as fact.",
    tables: [
      {
        name: "Tops",
        headers: ["Size", "Chest (cm)", "Length (cm)"],
        rows: [
          ["S", "56", "70"],
          ["M", "60", "72"],
          ["L", "64", "74"],
          ["XL", "68", "76"],
        ],
      },
      {
        name: "Headwear",
        headers: ["Piece", "Fit"],
        rows: [
          ["Snapback", "One size, adjustable"],
          ["Beanie", "One size"],
        ],
      },
    ],
  },
  pages: {
    about: {
      title: "About Hood Boyz",
      updated: "4 November 2026",
      sections: [
        {
          heading: "The house",
          body: "Hood Boyz edits graphic streetwear and everyday pieces for people who dress with intention. The point of view is individual, confident and contemporary.",
        },
        {
          heading: "What you are looking at",
          body: "The opening catalogue uses the supplied garment photographs. Product names follow the marks printed on the clothes. Descriptions avoid fibre and measurement claims that have not been supplied.",
        },
      ],
    },
    faq: {
      title: "Questions",
      updated: "4 November 2026",
      sections: [
        {
          heading: "Are these prices final?",
          body: "Opening prices are sample prices until the studio confirms them. The product page says so while that setting is on.",
        },
        {
          heading: "How do I pay?",
          body: "Pay on delivery is available now. Card and mobile money run through Paystack once the secret key is configured. An order is paid only after Paystack verifies it, or after the studio confirms a delivery payment.",
        },
        {
          heading: "How do I track an order?",
          body: "Use the order number and the email from checkout. The order number alone is not enough.",
        },
      ],
    },
    shipping: {
      title: "Shipping",
      updated: "4 November 2026",
      sections: [
        {
          heading: "Methods",
          body: "Standard delivery, express delivery and Accra pickup are starting methods. Fees are stored in the database and can be changed in admin. No free-shipping offer is active until a threshold is saved.",
        },
        {
          heading: "Timing",
          body: "Estimated windows are shown at checkout. They are not a guarantee until a shipment is recorded.",
        },
      ],
    },
    returns: {
      title: "Returns",
      updated: "4 November 2026",
      sections: [
        {
          heading: "Unworn pieces",
          body: "Contact the studio within 7 days of delivery if a piece is unworn, unwashed and in its original condition. This is a starting policy and should be reviewed before launch.",
        },
        {
          heading: "Refunds",
          body: "Paystack refunds are sent through Paystack. Pay-on-delivery refunds are recorded manually by an administrator. A refund is not marked succeeded until that step completes.",
        },
      ],
    },
    privacy: {
      title: "Privacy",
      updated: "4 November 2026",
      sections: [
        {
          heading: "What we store",
          body: "Account details, addresses, orders, wishlist items and newsletter emails you submit. Payment card numbers are never stored. Paystack handles card and mobile-money details on its own page.",
        },
        {
          heading: "Your request",
          body: "Email the studio address in the footer to ask for a copy or deletion of your account data. Have counsel review this notice before the shop goes live.",
        },
      ],
    },
    terms: {
      title: "Terms",
      updated: "4 November 2026",
      sections: [
        {
          heading: "Orders",
          body: "Placing an order is an offer to buy the pieces listed at the price calculated on our server. We may refuse an order that fails stock or payment checks.",
        },
        {
          heading: "Sample catalogue",
          body: "While sample pricing and demonstration stock are switched on, those figures are not a promise of live warehouse availability or a confirmed retail price.",
        },
      ],
    },
    cookies: {
      title: "Cookies",
      updated: "4 November 2026",
      sections: [
        {
          heading: "What we use",
          body: "A guest bag cookie, a sign-in cookie, and a short-lived cookie that lets you open the order you just placed. We do not use advertising cookies.",
        },
      ],
    },
  },
}

export type ContentDefaults = typeof contentDefaults
export type PageDoc = ContentDefaults["pages"]["about"]
