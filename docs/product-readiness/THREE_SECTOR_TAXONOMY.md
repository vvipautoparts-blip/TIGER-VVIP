# THREE SECTOR TAXONOMY

## Sector 1: Auto Parts And Services

### Main Categories

- Spare parts
- Mechanical services
- Electrical services
- Body and paint
- Tires and batteries
- Diagnostics and maintenance

### Example Subcategories

- Engine, transmission, suspension, brakes, AC
- Workshop service, mobile service, emergency support

## Sector 2: Materials And Supplies

### Main Categories

- Construction materials
- Industrial supplies
- Electrical supplies
- Plumbing supplies
- Packaging and warehouse supplies

### Example Subcategories

- Cement, steel, insulation
- Wiring, breakers, control accessories

## Sector 3: Real Estate

### Main Categories

- Residential
- Commercial
- Land
- Short-term and long-term leasing

### Example Subcategories

- Apartment, villa, office, store, warehouse, plot

## Required And Optional Fields

### Required Fields (All Sectors)

- Listing title
- Sector
- Main category
- Price (`> 0`)
- Currency
- Governorate/region
- City/area
- At least 1 image, up to 7 images
- Listing owner account reference

### Optional Fields (All Sectors)

- Description
- Contact preference
- Secondary location details
- Additional attributes by category

## Shared Fields Across Sectors

- Title
- Description
- Sector/category/subcategory
- Price/currency
- Location
- Images
- Listing status
- Created/updated timestamps

## Sector-Specific Fields

### Auto Parts And Services

- Vehicle make/model/year compatibility
- Condition (new/used)
- Service type and availability

### Materials And Supplies

- Unit type (kg, ton, piece, box, meter)
- Quantity/stock indicator
- Delivery capability indicator

### Real Estate

- Property type
- Area size (sqm)
- Furnishing state
- Bedrooms/bathrooms where applicable
- Sale/rent mode

## Predefined Values Vs Free Text

- Predefined: sector, category, subcategory, currency, status, standard conditions.
- Free text: title, description, optional notes.
- Rule: predefined values should be used whenever consistency/search quality is required.

## Price, Location, And Image Rules

- Price is mandatory and must be greater than zero.
- Location fields are mandatory for discovery relevance.
- Images are required, image-only, max 7.
- Aspect ratio target is `4:3` after editing flow.
- No video is allowed in listing media.