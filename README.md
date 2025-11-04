# School Restaurant Menu API Client

This tool provides a client for accessing school restaurant menu data through a REST API.

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory with your credentials:

```env
API_USERNAME=your_username
API_PASSWORD=your_password
```

## Usage

```typescript
import { getMenuData } from './src';

const menuData = await getMenuData({
  enteName: "bassa-romagna",
  date: "2025-11-04",
  menuId: "591",
  serviceId: "3",
  supplypointId: "31"
});
```

## CLI Usage

```bash
npm start -- --ente bassa-romagna --date 2025-11-04 --menu-id 591 --service-id 3 --supplypoint-id 31
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## License

ISC