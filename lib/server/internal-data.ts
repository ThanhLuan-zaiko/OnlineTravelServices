import "server-only";

export {
  addDestinationMedia,
  archiveInternalDestination,
  createInternalDestination,
  deleteDestinationMedia,
  findDestinationMedia,
  findInternalDestination,
  listDestinationMedia,
  listInternalDestinations,
  setDestinationCoverImage,
  updateInternalDestination,
} from "@/lib/server/internal-data/destinations";
export {
  addTourMedia,
  deleteTourMedia,
  findTourMedia,
  listTourMedia,
  setTourMediaCover,
} from "@/lib/server/internal-data/tour-media";
export {
  archiveInternalPromotion,
  createInternalPromotion,
  findInternalPromotion,
  listInternalPromotions,
  updateInternalPromotion,
} from "@/lib/server/internal-data/promotions";
export {
  deleteItineraryItem,
  listItineraryByTour,
  upsertItineraryItem,
} from "@/lib/server/internal-data/itinerary";
export {
  archiveInternalTour,
  createInternalTour,
  findInternalTour,
  listInternalTours,
  updateInternalTour,
} from "@/lib/server/internal-data/tours";
export {
  createSchedule,
  deleteSchedule,
  listSchedulesByTour,
  updateSchedule,
} from "@/lib/server/internal-data/schedules";
export {
  createTourVehicle,
  deleteTourVehicle,
  findTourVehicle,
  listTourVehicles,
  updateTourVehicle,
} from "@/lib/server/internal-data/tour-vehicles";
export {
  createInternalService,
  deleteInternalService,
  findInternalService,
  listInternalServices,
  updateInternalService,
} from "@/lib/server/internal-data/services";
export {
  createInternalServiceProvider,
  deleteInternalServiceProvider,
  findInternalServiceProvider,
  listInternalServiceProviders,
  updateInternalServiceProvider,
} from "@/lib/server/internal-data/service-providers";
export {
  createInternalVehicleCatalog,
  clearInternalVehicleCatalogImage,
  deleteInternalVehicleCatalog,
  setInternalVehicleCatalogImage,
  findInternalVehicleCatalog,
  listInternalVehicleCatalog,
  updateInternalVehicleCatalog,
} from "@/lib/server/internal-data/vehicle-catalog";
export { getRevenueDashboard } from "@/lib/server/internal-data/revenue";
