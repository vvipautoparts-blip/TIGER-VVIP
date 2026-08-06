# THREE SECTOR TAXONOMY

## Sector 1: Auto Parts And Services

### Main Categories

- Parts
- Maintenance
- Electrical / Hybrid
- General services
- Dealers / distributors

### Example Fields And Subcategories

- Vehicle class.
- Make.
- Model.
- Year.
- Part or service name.
- Condition.
- Price.
- Location.
- Compatibility.
- Seller/business type.
- Engine, transmission, suspension, brakes, AC.
- Workshop service, mobile service, emergency support.

## Sector 2: Materials And Supplies

### Main Categories

- Construction materials
- Electrical materials
- Plumbing
- Industrial supplies
- Tools
- Safety supplies
- Finishing materials
- Other suggestion pending admin approval

### Example Fields

- Material name.
- Unit type.
- Quantity or stock indicator.
- Delivery capability indicator.
- Price.
- Location.

## Sector 3: Real Estate

### Main Categories

- House
- Apartment
- Land
- Villa
- Shop
- Office
- Warehouse
- Farm
- Commercial property
- Sale
- Rent

## Required And Optional Fields

### Required Fields (All Sectors)

- Listing title.
- Sector.
- Main category.
- Price (`> 0`).
- Currency.
- Governorate/region.
- City/area.
- At least 1 image, up to 7 images.
- Listing owner account reference.

### Optional Fields (All Sectors)

- Description.
- Contact preference.
- Secondary location details.
- Additional attributes by category.

## Shared Fields Across Sectors

- Title.
- Description.
- Sector/category/subcategory.
- Price/currency.
- Location.
- Images.
- Listing status.
- Created/updated timestamps.

## Predefined Values Vs Free Text

- Predefined: sector, category, subcategory, currency, status, standard conditions.
- Free text: title, description, short notes.
- Rule: structured data should be roughly 80% and free text roughly 20% for consistency.

## Price, Location, And Image Rules

- Price is mandatory and must be greater than zero.
- Decimal prices are allowed.
- Location fields are mandatory for discovery relevance.
- Images are required, image-only, max 7.
- Aspect ratio target is `4:3`.
- Cover image selection is required.
- Reorder is allowed.
- No video is allowed in listing media.

## Boundary

- No backend implementation is executed by this document.