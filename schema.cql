-- Online Travel Services ScyllaDB schema.
-- Designed for query-first access patterns. Data that would be joined in SQL
-- is intentionally duplicated into read-optimized tables.

CREATE KEYSPACE IF NOT EXISTS online_travel_services
WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
}
AND durable_writes = true;

USE online_travel_services;

-- Accounts, authentication, and authorization.

CREATE TABLE IF NOT EXISTS users_by_id (
  user_id uuid,
  email text,
  phone text,
  password_hash text,
  full_name text,
  role text,
  status text,
  customer_tier text,
  vip_tier text,
  created_at timestamp,
  updated_at timestamp,
  last_login_at timestamp,
  failed_login_count int,
  metadata map<text, text>,
  PRIMARY KEY ((user_id))
);

CREATE TABLE IF NOT EXISTS users_by_email (
  email text,
  user_id uuid,
  password_hash text,
  full_name text,
  role text,
  status text,
  customer_tier text,
  vip_tier text,
  created_at timestamp,
  last_login_at timestamp,
  PRIMARY KEY ((email))
);

CREATE TABLE IF NOT EXISTS users_by_phone (
  phone text,
  user_id uuid,
  email text,
  full_name text,
  role text,
  status text,
  created_at timestamp,
  PRIMARY KEY ((phone))
);

CREATE TABLE IF NOT EXISTS users_by_role (
  role text,
  status text,
  created_at timestamp,
  user_id uuid,
  email text,
  full_name text,
  phone text,
  PRIMARY KEY ((role), status, created_at, user_id)
) WITH CLUSTERING ORDER BY (status ASC, created_at DESC, user_id ASC);

CREATE TABLE IF NOT EXISTS user_sessions (
  user_id uuid,
  session_id uuid,
  refresh_token_hash text,
  device_label text,
  ip_address text,
  user_agent text,
  created_at timestamp,
  expires_at timestamp,
  revoked_at timestamp,
  PRIMARY KEY ((user_id), session_id)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash text,
  user_id uuid,
  email text,
  requested_at timestamp,
  expires_at timestamp,
  used_at timestamp,
  ip_address text,
  PRIMARY KEY ((token_hash))
);

CREATE TABLE IF NOT EXISTS user_profile_by_id (
  user_id uuid,
  full_name text,
  gender text,
  birth_date date,
  avatar_url text,
  address text,
  nationality text,
  passport_number text,
  emergency_contact_name text,
  emergency_contact_phone text,
  preferences map<text, text>,
  updated_at timestamp,
  PRIMARY KEY ((user_id))
);

CREATE TABLE IF NOT EXISTS user_security_events (
  user_id uuid,
  event_time timeuuid,
  event_type text,
  ip_address text,
  user_agent text,
  risk_level text,
  detail text,
  PRIMARY KEY ((user_id), event_time)
) WITH CLUSTERING ORDER BY (event_time DESC);

-- Customers and VIP programs.

CREATE TABLE IF NOT EXISTS customers_by_id (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  status text,
  customer_tier text,
  vip_tier text,
  loyalty_points int,
  total_bookings int,
  total_spent decimal,
  violation_count int,
  last_booking_at timestamp,
  created_at timestamp,
  PRIMARY KEY ((user_id))
);

CREATE TABLE IF NOT EXISTS customers_by_status (
  status text,
  created_at timestamp,
  user_id uuid,
  email text,
  full_name text,
  phone text,
  customer_tier text,
  vip_tier text,
  loyalty_points int,
  total_bookings int,
  total_spent decimal,
  violation_count int,
  last_booking_at timestamp,
  PRIMARY KEY ((status), created_at, user_id)
) WITH CLUSTERING ORDER BY (created_at DESC, user_id ASC);

CREATE TABLE IF NOT EXISTS customers_by_tier (
  customer_tier text,
  loyalty_points int,
  user_id uuid,
  email text,
  full_name text,
  phone text,
  status text,
  vip_tier text,
  total_bookings int,
  total_spent decimal,
  violation_count int,
  last_booking_at timestamp,
  created_at timestamp,
  PRIMARY KEY ((customer_tier), loyalty_points, user_id)
) WITH CLUSTERING ORDER BY (loyalty_points DESC, user_id ASC);

CREATE TABLE IF NOT EXISTS customers_by_vip_tier (
  vip_tier text,
  loyalty_points int,
  user_id uuid,
  email text,
  full_name text,
  phone text,
  status text,
  customer_tier text,
  total_bookings int,
  total_spent decimal,
  violation_count int,
  last_booking_at timestamp,
  created_at timestamp,
  PRIMARY KEY ((vip_tier), loyalty_points, user_id)
) WITH CLUSTERING ORDER BY (loyalty_points DESC, user_id ASC);

CREATE TABLE IF NOT EXISTS vip_customers_by_tier (
  vip_tier text,
  loyalty_points int,
  user_id uuid,
  full_name text,
  email text,
  phone text,
  total_spent decimal,
  last_booking_at timestamp,
  PRIMARY KEY ((vip_tier), loyalty_points, user_id)
) WITH CLUSTERING ORDER BY (loyalty_points DESC, user_id ASC);

CREATE TABLE IF NOT EXISTS customer_history_by_user (
  user_id uuid,
  event_time timeuuid,
  event_type text,
  entity_type text,
  entity_id uuid,
  title text,
  detail text,
  amount decimal,
  PRIMARY KEY ((user_id), event_time)
) WITH CLUSTERING ORDER BY (event_time DESC);

CREATE TABLE IF NOT EXISTS customer_preferences (
  user_id uuid,
  preference_key text,
  preference_value text,
  source text,
  updated_at timestamp,
  PRIMARY KEY ((user_id), preference_key)
);

CREATE TABLE IF NOT EXISTS customer_violations (
  user_id uuid,
  violation_time timeuuid,
  violation_type text,
  severity text,
  description text,
  action_taken text,
  points_deducted int,
  staff_id uuid,
  PRIMARY KEY ((user_id), violation_time)
) WITH CLUSTERING ORDER BY (violation_time DESC);

CREATE TABLE IF NOT EXISTS customer_rewards (
  user_id uuid,
  reward_time timeuuid,
  reward_type text,
  title text,
  description text,
  points_delta int,
  promotion_id uuid,
  expires_at timestamp,
  redeemed_at timestamp,
  PRIMARY KEY ((user_id), reward_time)
) WITH CLUSTERING ORDER BY (reward_time DESC);

CREATE TABLE IF NOT EXISTS customer_rewards_by_status (
  status text,
  expires_at timestamp,
  user_id uuid,
  reward_time timeuuid,
  reward_type text,
  title text,
  description text,
  points_delta int,
  promotion_id uuid,
  redeemed_at timestamp,
  PRIMARY KEY ((status), expires_at, user_id, reward_time)
) WITH CLUSTERING ORDER BY (expires_at ASC, user_id ASC, reward_time DESC);

-- Staff, administration, and operations.

CREATE TABLE IF NOT EXISTS staff_by_id (
  staff_id uuid,
  user_id uuid,
  email text,
  full_name text,
  role text,
  department text,
  status text,
  staff_level text,
  hired_at timestamp,
  last_activity_at timestamp,
  permissions set<text>,
  PRIMARY KEY ((staff_id))
);

CREATE TABLE IF NOT EXISTS staff_by_role (
  role text,
  status text,
  staff_id uuid,
  user_id uuid,
  email text,
  full_name text,
  department text,
  last_activity_at timestamp,
  PRIMARY KEY ((role), status, staff_id)
);

CREATE TABLE IF NOT EXISTS staff_activity_by_day (
  staff_id uuid,
  activity_date date,
  activity_time timeuuid,
  activity_type text,
  entity_type text,
  entity_id uuid,
  description text,
  PRIMARY KEY ((staff_id, activity_date), activity_time)
) WITH CLUSTERING ORDER BY (activity_time DESC);

CREATE TABLE IF NOT EXISTS admin_system_tasks (
  task_status text,
  created_at timeuuid,
  task_id uuid,
  task_type text,
  title text,
  assigned_to uuid,
  priority text,
  due_at timestamp,
  completed_at timestamp,
  PRIMARY KEY ((task_status), created_at, task_id)
) WITH CLUSTERING ORDER BY (created_at DESC, task_id ASC);

CREATE TABLE IF NOT EXISTS system_backups (
  backup_day date,
  backup_time timeuuid,
  backup_id uuid,
  backup_type text,
  status text,
  storage_uri text,
  size_bytes bigint,
  started_by uuid,
  finished_at timestamp,
  PRIMARY KEY ((backup_day), backup_time, backup_id)
) WITH CLUSTERING ORDER BY (backup_time DESC, backup_id ASC);

CREATE TABLE IF NOT EXISTS system_maintenance_logs (
  maintenance_day date,
  event_time timeuuid,
  event_id uuid,
  component text,
  status text,
  title text,
  description text,
  staff_id uuid,
  PRIMARY KEY ((maintenance_day), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);

-- Destinations.

CREATE TABLE IF NOT EXISTS destinations_by_id (
  destination_id uuid,
  name text,
  country text,
  region text,
  city text,
  category text,
  status text,
  description text,
  cover_image_url text,
  address text,
  latitude decimal,
  longitude decimal,
  search_keywords list<text>,
  average_rating decimal,
  safety_level text,
  popularity_score int,
  created_at timestamp,
  updated_at timestamp,
  PRIMARY KEY ((destination_id))
);

CREATE TABLE IF NOT EXISTS destinations_by_region (
  country text,
  region text,
  city text,
  popularity_score int,
  destination_id uuid,
  name text,
  category text,
  status text,
  average_rating decimal,
  cover_image_url text,
  PRIMARY KEY ((country, region), city, popularity_score, destination_id)
) WITH CLUSTERING ORDER BY (city ASC, popularity_score DESC, destination_id ASC);

CREATE TABLE IF NOT EXISTS destinations_by_rating (
  category text,
  average_rating decimal,
  destination_id uuid,
  name text,
  country text,
  region text,
  city text,
  popularity_score int,
  PRIMARY KEY ((category), average_rating, destination_id)
) WITH CLUSTERING ORDER BY (average_rating DESC, destination_id ASC);

CREATE TABLE IF NOT EXISTS destination_status_by_admin (
  status text,
  updated_at timeuuid,
  destination_id uuid,
  name text,
  country text,
  region text,
  updated_by uuid,
  reason text,
  PRIMARY KEY ((status), updated_at, destination_id)
) WITH CLUSTERING ORDER BY (updated_at DESC, destination_id ASC);

CREATE TABLE IF NOT EXISTS destination_performance_by_month (
  destination_id uuid,
  stat_month text,
  booking_count int,
  visitor_count int,
  revenue decimal,
  average_rating decimal,
  review_count int,
  calculated_at timestamp,
  PRIMARY KEY ((destination_id), stat_month)
) WITH CLUSTERING ORDER BY (stat_month DESC);

CREATE TABLE IF NOT EXISTS destination_media_by_destination (
  destination_id uuid,
  media_order int,
  media_id uuid,
  media_type text,
  title text,
  media_url text,
  thumbnail_url text,
  uploaded_by uuid,
  uploaded_at timestamp,
  PRIMARY KEY ((destination_id), media_order, media_id)
);

-- Tours, schedules, services, and pricing.

CREATE TABLE IF NOT EXISTS tours_by_id (
  tour_id uuid,
  title text,
  slug text,
  destination_id uuid,
  destination_name text,
  cover_image_url text,
  category text,
  status text,
  tour_type text,
  vehicle_catalog_label text,
  vehicle_catalog_id text,
  vehicle_type text,
  vehicle_model text,
  vehicle_capacity int,
  base_price decimal,
  currency text,
  duration_days int,
  duration_nights int,
  max_guests int,
  min_guests int,
  average_rating decimal,
  rating_count int,
  vip_only boolean,
  created_by uuid,
  approved_by uuid,
  created_at timestamp,
  updated_at timestamp,
  published_at timestamp,
  summary text,
  included_services list<text>,
  excluded_services list<text>,
  PRIMARY KEY ((tour_id))
);

CREATE TABLE IF NOT EXISTS tours_by_status (
  status text,
  updated_at timeuuid,
  tour_id uuid,
  title text,
  destination_name text,
  category text,
  base_price decimal,
  created_by uuid,
  PRIMARY KEY ((status), updated_at, tour_id)
) WITH CLUSTERING ORDER BY (updated_at DESC, tour_id ASC);

CREATE TABLE IF NOT EXISTS tours_by_destination (
  destination_id uuid,
  status text,
  popularity_score int,
  tour_id uuid,
  title text,
  category text,
  base_price decimal,
  duration_days int,
  average_rating decimal,
  cover_image_url text,
  PRIMARY KEY ((destination_id), status, popularity_score, tour_id)
) WITH CLUSTERING ORDER BY (status ASC, popularity_score DESC, tour_id ASC);

CREATE TABLE IF NOT EXISTS tours_by_category (
  category text,
  status text,
  base_price decimal,
  tour_id uuid,
  title text,
  destination_name text,
  duration_days int,
  average_rating decimal,
  PRIMARY KEY ((category), status, base_price, tour_id)
);

CREATE TABLE IF NOT EXISTS public_tours_by_feed (
  feed text,
  published_at timestamp,
  tour_id uuid,
  slug text,
  title text,
  summary text,
  destination_id uuid,
  destination_name text,
  country text,
  region text,
  city text,
  address text,
  latitude decimal,
  longitude decimal,
  category text,
  tour_type text,
  base_price decimal,
  currency text,
  duration_days int,
  duration_nights int,
  min_guests int,
  max_guests int,
  average_rating decimal,
  rating_count int,
  vip_only boolean,
  cover_image_url text,
  next_departure_date date,
  next_departure_time text,
  next_departure_price decimal,
  next_departure_currency text,
  next_available_slots int,
  updated_at timestamp,
  PRIMARY KEY ((feed), published_at, tour_id)
) WITH CLUSTERING ORDER BY (published_at DESC, tour_id ASC);

CREATE TABLE IF NOT EXISTS public_tours_by_country (
  feed text,
  country_key text,
  published_at timestamp,
  tour_id uuid,
  slug text,
  title text,
  summary text,
  destination_id uuid,
  destination_name text,
  country text,
  region text,
  city text,
  address text,
  latitude decimal,
  longitude decimal,
  category text,
  tour_type text,
  base_price decimal,
  currency text,
  duration_days int,
  duration_nights int,
  min_guests int,
  max_guests int,
  average_rating decimal,
  rating_count int,
  vip_only boolean,
  cover_image_url text,
  next_departure_date date,
  next_departure_time text,
  next_departure_price decimal,
  next_departure_currency text,
  next_available_slots int,
  updated_at timestamp,
  PRIMARY KEY ((feed, country_key), published_at, tour_id)
) WITH CLUSTERING ORDER BY (published_at DESC, tour_id ASC);

CREATE TABLE IF NOT EXISTS public_tour_countries_by_feed (
  feed text,
  country_key text,
  country text,
  updated_at timestamp,
  PRIMARY KEY ((feed), country_key)
);

CREATE TABLE IF NOT EXISTS public_tour_projection_keys_by_tour (
  tour_id uuid,
  feed text,
  published_at timestamp,
  country_key text,
  country text,
  PRIMARY KEY ((tour_id), feed)
);

CREATE TABLE IF NOT EXISTS tour_schedules_by_tour (
  tour_id uuid,
  departure_date date,
  schedule_id uuid,
  status text,
  departure_time text,
  available_slots int,
  booked_slots int,
  price decimal,
  currency text,
  guide_staff_id uuid,
  PRIMARY KEY ((tour_id), departure_date, schedule_id)
) WITH CLUSTERING ORDER BY (departure_date ASC, schedule_id ASC);

CREATE TABLE IF NOT EXISTS tour_itinerary_items (
  tour_id uuid,
  day_number int,
  item_order int,
  title text,
  description text,
  location_name text,
  start_time text,
  end_time text,
  service_type text,
  PRIMARY KEY ((tour_id), day_number, item_order)
);

CREATE TABLE IF NOT EXISTS tour_services_by_tour (
  tour_id uuid,
  service_type text,
  service_id uuid,
  name text,
  description text,
  price_delta decimal,
  optional boolean,
  provider_name text,
  PRIMARY KEY ((tour_id), service_type, service_id)
);

CREATE TABLE IF NOT EXISTS tour_media_by_tour (
  tour_id uuid,
  media_order int,
  media_id uuid,
  media_type text,
  title text,
  media_url text,
  thumbnail_url text,
  uploaded_by uuid,
  uploaded_at timestamp,
  PRIMARY KEY ((tour_id), media_order, media_id)
);

CREATE TABLE IF NOT EXISTS tour_vehicles_by_tour (
  tour_id uuid,
  vehicle_id uuid,
  vehicle_type text,
  plate_number text,
  model text,
  capacity int,
  driver_name text,
  driver_phone text,
  notes text,
  status text,
  updated_at timestamp,
  PRIMARY KEY ((tour_id), vehicle_id)
);

CREATE TABLE IF NOT EXISTS vehicle_catalog_by_bucket (
  catalog_bucket text,
  vehicle_catalog_id uuid,
  archived_at timestamp,
  archived_from_status text,
  image_url text,
  label text,
  vehicle_type text,
  vehicle_model text,
  vehicle_capacity int,
  status text,
  thumbnail_url text,
  updated_at timestamp,
  PRIMARY KEY ((catalog_bucket), vehicle_catalog_id)
);

CREATE TABLE IF NOT EXISTS vehicle_catalog_media_by_catalog (
  vehicle_catalog_id uuid,
  media_order int,
  media_id uuid,
  media_url text,
  thumbnail_url text,
  title text,
  uploaded_at timestamp,
  uploaded_by uuid,
  is_cover boolean,
  PRIMARY KEY ((vehicle_catalog_id), media_order, media_id)
);

CREATE TABLE IF NOT EXISTS service_providers_by_type (
  service_type text,
  status text,
  provider_id uuid,
  archived_at timestamp,
  archived_from_status text,
  image_url text,
  provider_name text,
  region text,
  phone text,
  email text,
  rating decimal,
  contract_status text,
  thumbnail_url text,
  updated_at timestamp,
  PRIMARY KEY ((service_type), status, provider_id)
);

CREATE TABLE IF NOT EXISTS service_provider_media_by_provider (
  service_type text,
  provider_id uuid,
  media_order int,
  media_id uuid,
  media_url text,
  thumbnail_url text,
  title text,
  uploaded_at timestamp,
  uploaded_by uuid,
  is_cover boolean,
  PRIMARY KEY ((service_type, provider_id), media_order, media_id)
);

CREATE TABLE IF NOT EXISTS service_catalog_by_destination (
  destination_id uuid,
  service_type text,
  service_id uuid,
  archived_at timestamp,
  archived_from_status text,
  provider_id uuid,
  image_url text,
  name text,
  description text,
  base_price decimal,
  currency text,
  status text,
  thumbnail_url text,
  updated_at timestamp,
  PRIMARY KEY ((destination_id), service_type, service_id)
);

CREATE TABLE IF NOT EXISTS service_media_by_service (
  destination_id uuid,
  service_type text,
  service_id uuid,
  media_order int,
  media_id uuid,
  media_url text,
  thumbnail_url text,
  title text,
  uploaded_at timestamp,
  uploaded_by uuid,
  is_cover boolean,
  PRIMARY KEY ((destination_id, service_type, service_id), media_order, media_id)
);

CREATE TABLE IF NOT EXISTS tour_price_history (
  tour_id uuid,
  changed_at timeuuid,
  old_price decimal,
  new_price decimal,
  currency text,
  reason text,
  changed_by uuid,
  PRIMARY KEY ((tour_id), changed_at)
) WITH CLUSTERING ORDER BY (changed_at DESC);

-- Personalized tours and quote negotiation.

CREATE TABLE IF NOT EXISTS custom_tour_requests_by_user (
  user_id uuid,
  requested_at timeuuid,
  request_id uuid,
  status text,
  title text,
  destination_ids list<uuid>,
  budget_min decimal,
  budget_max decimal,
  guest_count int,
  preferred_start_date date,
  preferred_end_date date,
  assigned_staff_id uuid,
  PRIMARY KEY ((user_id), requested_at, request_id)
) WITH CLUSTERING ORDER BY (requested_at DESC, request_id ASC);

CREATE TABLE IF NOT EXISTS custom_tour_requests_by_status (
  status text,
  updated_at timeuuid,
  request_id uuid,
  user_id uuid,
  title text,
  guest_count int,
  budget_max decimal,
  assigned_staff_id uuid,
  PRIMARY KEY ((status), updated_at, request_id)
) WITH CLUSTERING ORDER BY (updated_at DESC, request_id ASC);

CREATE TABLE IF NOT EXISTS custom_tour_options (
  request_id uuid,
  option_version int,
  created_at timestamp,
  title text,
  itinerary_summary text,
  estimated_price decimal,
  currency text,
  service_summary map<text, text>,
  status text,
  created_by uuid,
  PRIMARY KEY ((request_id), option_version)
) WITH CLUSTERING ORDER BY (option_version DESC);

CREATE TABLE IF NOT EXISTS custom_tour_negotiations (
  request_id uuid,
  message_time timeuuid,
  message_id uuid,
  sender_user_id uuid,
  sender_role text,
  message_type text,
  content text,
  proposed_price decimal,
  PRIMARY KEY ((request_id), message_time, message_id)
) WITH CLUSTERING ORDER BY (message_time DESC, message_id ASC);

-- Bookings, passengers, and trip tracking.

CREATE TABLE IF NOT EXISTS bookings_by_id (
  booking_id uuid,
  user_id uuid,
  tour_id uuid,
  schedule_id uuid,
  booking_code text,
  status text,
  payment_status text,
  guest_count int,
  total_amount decimal,
  currency text,
  booked_at timestamp,
  updated_at timestamp,
  departure_date date,
  cancellation_reason text,
  special_requests text,
  PRIMARY KEY ((booking_id))
);

CREATE TABLE IF NOT EXISTS bookings_by_user (
  user_id uuid,
  booked_at timeuuid,
  booking_id uuid,
  booking_code text,
  tour_id uuid,
  tour_title text,
  status text,
  payment_status text,
  total_amount decimal,
  currency text,
  departure_date date,
  PRIMARY KEY ((user_id), booked_at, booking_id)
) WITH CLUSTERING ORDER BY (booked_at DESC, booking_id ASC);

CREATE TABLE IF NOT EXISTS bookings_by_tour (
  tour_id uuid,
  departure_date date,
  booking_id uuid,
  user_id uuid,
  booking_code text,
  status text,
  guest_count int,
  total_amount decimal,
  booked_at timestamp,
  PRIMARY KEY ((tour_id), departure_date, booking_id)
) WITH CLUSTERING ORDER BY (departure_date ASC, booking_id ASC);

CREATE TABLE IF NOT EXISTS bookings_by_status_day (
  status text,
  booking_day date,
  booked_at timeuuid,
  booking_id uuid,
  user_id uuid,
  tour_id uuid,
  booking_code text,
  payment_status text,
  total_amount decimal,
  PRIMARY KEY ((status, booking_day), booked_at, booking_id)
) WITH CLUSTERING ORDER BY (booked_at DESC, booking_id ASC);

CREATE TABLE IF NOT EXISTS booking_passengers (
  booking_id uuid,
  passenger_no int,
  full_name text,
  birth_date date,
  gender text,
  nationality text,
  passport_number text,
  phone text,
  email text,
  notes text,
  PRIMARY KEY ((booking_id), passenger_no)
);

CREATE TABLE IF NOT EXISTS booking_status_events (
  booking_id uuid,
  event_time timeuuid,
  old_status text,
  new_status text,
  reason text,
  changed_by uuid,
  PRIMARY KEY ((booking_id), event_time)
) WITH CLUSTERING ORDER BY (event_time DESC);

CREATE TABLE IF NOT EXISTS trip_tracking_by_booking (
  booking_id uuid,
  event_time timeuuid,
  event_type text,
  title text,
  description text,
  latitude decimal,
  longitude decimal,
  staff_id uuid,
  PRIMARY KEY ((booking_id), event_time)
) WITH CLUSTERING ORDER BY (event_time DESC);

-- Payments and refunds.

CREATE TABLE IF NOT EXISTS payments_by_id (
  payment_id uuid,
  booking_id uuid,
  user_id uuid,
  amount decimal,
  currency text,
  provider text,
  provider_transaction_id text,
  status text,
  payment_method text,
  created_at timestamp,
  confirmed_at timestamp,
  failure_reason text,
  PRIMARY KEY ((payment_id))
);

CREATE TABLE IF NOT EXISTS payments_by_booking (
  booking_id uuid,
  created_at timeuuid,
  payment_id uuid,
  amount decimal,
  currency text,
  provider text,
  status text,
  payment_method text,
  PRIMARY KEY ((booking_id), created_at, payment_id)
) WITH CLUSTERING ORDER BY (created_at DESC, payment_id ASC);

CREATE TABLE IF NOT EXISTS payments_by_user (
  user_id uuid,
  created_at timeuuid,
  payment_id uuid,
  booking_id uuid,
  amount decimal,
  currency text,
  provider text,
  status text,
  PRIMARY KEY ((user_id), created_at, payment_id)
) WITH CLUSTERING ORDER BY (created_at DESC, payment_id ASC);

CREATE TABLE IF NOT EXISTS payment_events_by_payment (
  payment_id uuid,
  event_time timeuuid,
  event_type text,
  status text,
  provider_payload text,
  description text,
  PRIMARY KEY ((payment_id), event_time)
) WITH CLUSTERING ORDER BY (event_time DESC);

CREATE TABLE IF NOT EXISTS refunds_by_booking (
  booking_id uuid,
  requested_at timeuuid,
  refund_id uuid,
  payment_id uuid,
  amount decimal,
  currency text,
  status text,
  reason text,
  processed_by uuid,
  processed_at timestamp,
  PRIMARY KEY ((booking_id), requested_at, refund_id)
) WITH CLUSTERING ORDER BY (requested_at DESC, refund_id ASC);

-- Reviews, ratings, and feedback.

CREATE TABLE IF NOT EXISTS reviews_by_tour (
  tour_id uuid,
  review_time timeuuid,
  review_id uuid,
  user_id uuid,
  full_name text,
  rating int,
  comment text,
  status text,
  is_vip_review boolean,
  PRIMARY KEY ((tour_id), review_time, review_id)
) WITH CLUSTERING ORDER BY (review_time DESC, review_id ASC);

CREATE TABLE IF NOT EXISTS reviews_by_user (
  user_id uuid,
  review_time timeuuid,
  review_id uuid,
  tour_id uuid,
  tour_title text,
  rating int,
  comment text,
  status text,
  PRIMARY KEY ((user_id), review_time, review_id)
) WITH CLUSTERING ORDER BY (review_time DESC, review_id ASC);

CREATE TABLE IF NOT EXISTS review_media_by_review (
  review_id uuid,
  media_no int,
  media_type text,
  media_url text,
  thumbnail_url text,
  uploaded_at timestamp,
  PRIMARY KEY ((review_id), media_no)
);

CREATE TABLE IF NOT EXISTS vip_feedback_queue (
  status text,
  submitted_at timeuuid,
  feedback_id uuid,
  user_id uuid,
  tour_id uuid,
  priority text,
  rating int,
  comment text,
  assigned_staff_id uuid,
  PRIMARY KEY ((status), submitted_at, feedback_id)
) WITH CLUSTERING ORDER BY (submitted_at DESC, feedback_id ASC);

CREATE TABLE IF NOT EXISTS tour_rating_summary (
  tour_id uuid,
  rating_bucket int,
  review_count int,
  updated_at timestamp,
  PRIMARY KEY ((tour_id), rating_bucket)
);

-- Promotions, campaigns, and VIP offers.

CREATE TABLE IF NOT EXISTS promotions_by_id (
  promotion_id uuid,
  archived_at timestamp,
  archived_from_status text,
  code text,
  title text,
  description text,
  image_url text,
  status text,
  promotion_type text,
  customer_tier text,
  customer_segment text,
  regular_gift_title text,
  vip_gift_title text,
  vip_discount_priority int,
  discount_type text,
  discount_value decimal,
  max_discount_amount decimal,
  start_at timestamp,
  end_at timestamp,
  usage_limit int,
  used_count int,
  revenue_impact decimal,
  created_by uuid,
  thumbnail_url text,
  PRIMARY KEY ((promotion_id))
);

CREATE TABLE IF NOT EXISTS promotion_media_by_promotion (
  promotion_id uuid,
  media_order int,
  media_id uuid,
  media_url text,
  thumbnail_url text,
  title text,
  uploaded_at timestamp,
  uploaded_by uuid,
  is_cover boolean,
  PRIMARY KEY ((promotion_id), media_order, media_id)
);

CREATE TABLE IF NOT EXISTS promotions_by_status (
  status text,
  start_at timestamp,
  promotion_id uuid,
  code text,
  title text,
  customer_tier text,
  customer_segment text,
  discount_type text,
  discount_value decimal,
  end_at timestamp,
  PRIMARY KEY ((status), start_at, promotion_id)
) WITH CLUSTERING ORDER BY (start_at DESC, promotion_id ASC);

CREATE TABLE IF NOT EXISTS promotions_by_customer_tier (
  customer_tier text,
  status text,
  end_at timestamp,
  promotion_id uuid,
  code text,
  title text,
  discount_type text,
  discount_value decimal,
  PRIMARY KEY ((customer_tier), status, end_at, promotion_id)
) WITH CLUSTERING ORDER BY (status ASC, end_at ASC, promotion_id ASC);

CREATE TABLE IF NOT EXISTS promotion_usage_by_user (
  user_id uuid,
  used_at timeuuid,
  promotion_id uuid,
  booking_id uuid,
  code text,
  discount_amount decimal,
  PRIMARY KEY ((user_id), used_at, promotion_id)
) WITH CLUSTERING ORDER BY (used_at DESC, promotion_id ASC);

CREATE TABLE IF NOT EXISTS vip_offers_by_user (
  user_id uuid,
  offer_time timeuuid,
  offer_id uuid,
  title text,
  offer_type text,
  promotion_id uuid,
  status text,
  expires_at timestamp,
  redeemed_at timestamp,
  PRIMARY KEY ((user_id), offer_time, offer_id)
) WITH CLUSTERING ORDER BY (offer_time DESC, offer_id ASC);

-- Notifications.

CREATE TABLE IF NOT EXISTS notifications_by_user (
  user_id uuid,
  notification_time timeuuid,
  notification_id uuid,
  notification_type text,
  title text,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamp,
  PRIMARY KEY ((user_id), notification_time, notification_id)
) WITH CLUSTERING ORDER BY (notification_time DESC, notification_id ASC);

CREATE TABLE IF NOT EXISTS notifications_by_staff (
  staff_id uuid,
  notification_time timeuuid,
  notification_id uuid,
  notification_type text,
  title text,
  body text,
  entity_type text,
  entity_id uuid,
  entity_label text,
  read_at timestamp,
  PRIMARY KEY ((staff_id), notification_time, notification_id)
) WITH CLUSTERING ORDER BY (notification_time DESC, notification_id ASC);

CREATE TABLE IF NOT EXISTS tour_update_notifications (
  tour_id uuid,
  notification_time timeuuid,
  notification_id uuid,
  booking_id uuid,
  user_id uuid,
  update_type text,
  title text,
  body text,
  delivery_status text,
  PRIMARY KEY ((tour_id), notification_time, notification_id)
) WITH CLUSTERING ORDER BY (notification_time DESC, notification_id ASC);

-- Reporting and analytics.

CREATE TABLE IF NOT EXISTS revenue_stats_by_day (
  stat_day date,
  currency text,
  total_revenue decimal,
  payment_count int,
  refund_amount decimal,
  net_revenue decimal,
  calculated_at timestamp,
  PRIMARY KEY ((stat_day), currency)
);

CREATE TABLE IF NOT EXISTS revenue_stats_by_month (
  stat_month text,
  currency text,
  total_revenue decimal,
  payment_count int,
  refund_amount decimal,
  net_revenue decimal,
  calculated_at timestamp,
  PRIMARY KEY ((stat_month), currency)
);

CREATE TABLE IF NOT EXISTS booking_stats_by_day (
  stat_day date,
  status text,
  booking_count int,
  guest_count int,
  gross_amount decimal,
  calculated_at timestamp,
  PRIMARY KEY ((stat_day), status)
);

CREATE TABLE IF NOT EXISTS customer_visit_stats_by_period (
  period_type text,
  period_value text,
  location_key text,
  visitor_count int,
  booking_count int,
  new_customer_count int,
  vip_customer_count int,
  calculated_at timestamp,
  PRIMARY KEY ((period_type), period_value, location_key)
) WITH CLUSTERING ORDER BY (period_value DESC, location_key ASC);

CREATE TABLE IF NOT EXISTS tour_performance_by_month (
  stat_month text,
  revenue decimal,
  tour_id uuid,
  title text,
  booking_count int,
  guest_count int,
  average_rating decimal,
  cancellation_count int,
  PRIMARY KEY ((stat_month), revenue, tour_id)
) WITH CLUSTERING ORDER BY (revenue DESC, tour_id ASC);

CREATE TABLE IF NOT EXISTS trend_analysis_snapshots (
  analysis_type text,
  snapshot_time timeuuid,
  snapshot_id uuid,
  title text,
  input_period text,
  result_summary text,
  positive_trend boolean,
  data_uri text,
  created_by uuid,
  PRIMARY KEY ((analysis_type), snapshot_time, snapshot_id)
) WITH CLUSTERING ORDER BY (snapshot_time DESC, snapshot_id ASC);

-- Audit, approval workflows, and partner change control.

CREATE TABLE IF NOT EXISTS audit_log_by_actor (
  actor_id uuid,
  event_time timeuuid,
  audit_id uuid,
  actor_role text,
  action text,
  entity_type text,
  entity_id uuid,
  description text,
  ip_address text,
  PRIMARY KEY ((actor_id), event_time, audit_id)
) WITH CLUSTERING ORDER BY (event_time DESC, audit_id ASC);

CREATE TABLE IF NOT EXISTS audit_log_by_entity (
  entity_type text,
  entity_id uuid,
  event_time timeuuid,
  audit_id uuid,
  actor_id uuid,
  actor_role text,
  action text,
  description text,
  PRIMARY KEY ((entity_type, entity_id), event_time, audit_id)
) WITH CLUSTERING ORDER BY (event_time DESC, audit_id ASC);

CREATE TABLE IF NOT EXISTS partner_change_requests (
  partner_id uuid,
  requested_at timeuuid,
  request_id uuid,
  entity_type text,
  entity_id uuid,
  change_type text,
  status text,
  payload text,
  reviewed_by uuid,
  reviewed_at timestamp,
  PRIMARY KEY ((partner_id), requested_at, request_id)
) WITH CLUSTERING ORDER BY (requested_at DESC, request_id ASC);

CREATE TABLE IF NOT EXISTS tour_approval_requests (
  status text,
  requested_at timeuuid,
  approval_id uuid,
  tour_id uuid,
  tour_title text,
  requested_by uuid,
  requested_by_name text,
  request_note text,
  risk_flags list<text>,
  reviewed_by uuid,
  review_note text,
  reviewed_at timestamp,
  change_request_detail text,
  PRIMARY KEY ((status), requested_at, approval_id)
) WITH CLUSTERING ORDER BY (requested_at DESC, approval_id ASC);

CREATE TABLE IF NOT EXISTS tour_approval_requests_by_id (
  approval_id uuid,
  status text,
  requested_at timeuuid,
  tour_id uuid,
  tour_title text,
  requested_by uuid,
  requested_by_name text,
  request_note text,
  risk_flags list<text>,
  reviewed_by uuid,
  review_note text,
  reviewed_at timestamp,
  change_request_detail text,
  PRIMARY KEY ((approval_id))
);

CREATE TABLE IF NOT EXISTS tour_approval_requests_by_tour (
  tour_id uuid,
  requested_at timeuuid,
  approval_id uuid,
  status text,
  tour_title text,
  requested_by uuid,
  requested_by_name text,
  request_note text,
  risk_flags list<text>,
  reviewed_by uuid,
  review_note text,
  reviewed_at timestamp,
  change_request_detail text,
  PRIMARY KEY ((tour_id), requested_at, approval_id)
) WITH CLUSTERING ORDER BY (requested_at DESC, approval_id ASC);

CREATE TABLE IF NOT EXISTS suggested_tours_by_id (
  suggestion_id uuid,
  status text,
  created_at timeuuid,
  source_type text,
  title text,
  destination_id uuid,
  destination_name text,
  proposed_by uuid,
  proposed_by_name text,
  budget_amount decimal,
  currency text,
  estimated_guests int,
  proposed_start_date date,
  proposed_end_date date,
  itinerary_summary text,
  service_summary text,
  safety_level text,
  feasibility_score int,
  feasibility_issues list<text>,
  decision_by uuid,
  decision_at timestamp,
  decision_note text,
  alternative_suggestion text,
  converted_tour_id uuid,
  PRIMARY KEY ((suggestion_id))
);

CREATE TABLE IF NOT EXISTS suggested_tours_by_status (
  status text,
  created_at timeuuid,
  suggestion_id uuid,
  source_type text,
  title text,
  destination_id uuid,
  destination_name text,
  proposed_by uuid,
  proposed_by_name text,
  budget_amount decimal,
  currency text,
  estimated_guests int,
  proposed_start_date date,
  proposed_end_date date,
  itinerary_summary text,
  service_summary text,
  safety_level text,
  feasibility_score int,
  feasibility_issues list<text>,
  decision_by uuid,
  decision_at timestamp,
  decision_note text,
  alternative_suggestion text,
  converted_tour_id uuid,
  PRIMARY KEY ((status), created_at, suggestion_id)
) WITH CLUSTERING ORDER BY (created_at DESC, suggestion_id ASC);

-- Secondary indexes for exact lookup and admin support.
-- Main application lists should still use the query-specific tables above.

CREATE INDEX IF NOT EXISTS idx_users_by_id_phone
ON users_by_id (phone);

CREATE INDEX IF NOT EXISTS idx_tours_by_id_slug
ON tours_by_id (slug);

CREATE INDEX IF NOT EXISTS idx_bookings_by_id_booking_code
ON bookings_by_id (booking_code);

CREATE INDEX IF NOT EXISTS idx_payments_by_id_provider_transaction_id
ON payments_by_id (provider_transaction_id);

CREATE INDEX IF NOT EXISTS idx_promotions_by_id_code
ON promotions_by_id (code);

CREATE INDEX IF NOT EXISTS idx_destinations_by_id_status
ON destinations_by_id (status);

CREATE INDEX IF NOT EXISTS idx_service_providers_by_type_region
ON service_providers_by_type (region);
