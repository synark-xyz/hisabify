-- Migration: 20260406000001_add_category_translations
-- Adds translations JSONB column to categories for i18n support.
-- Stores translations for all locales in a single JSONB column.
-- Format: {"en": {"name": "Food & Dining"}, "bn": {"name": "খাবার ও ডাইনিং"}, "ja": {"name": "食費"}}

-- Step 1: Add translations column
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Step 2: Create index for efficient locale lookups
CREATE INDEX IF NOT EXISTS idx_categories_translations ON public.categories USING GIN (translations);

-- Step 3: Update existing categories with translations
-- Parent categories (expense)
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Food And Drinks"},
  "bn": {"name": "খাবার ও ডাইনিং"},
  "ja": {"name": "食費"}
}'::jsonb WHERE name = 'Food And Drinks' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Shopping"},
  "bn": {"name": "কেনাকাটা"},
  "ja": {"name": "買い物"}
}'::jsonb WHERE name = 'Shopping' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Healthcare"},
  "bn": {"name": "স্বাস্থ্য"},
  "ja": {"name": "健康・医療費"}
}'::jsonb WHERE name = 'Healthcare' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Transportation"},
  "bn": {"name": "পরিবহন"},
  "ja": {"name": "交通費"}
}'::jsonb WHERE name = 'Transportation' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Entertainment"},
  "bn": {"name": "বিনোদন"},
  "ja": {"name": "娯楽"}
}'::jsonb WHERE name = 'Entertainment' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Bills & Utilities"},
  "bn": {"name": "বিল ও উপযোগিতা"},
  "ja": {"name": "光熱費"}
}'::jsonb WHERE name = 'Bills & Utilities' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Other"},
  "bn": {"name": "অন্যান্য"},
  "ja": {"name": "その他"}
}'::jsonb WHERE name = 'Other' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Savings"},
  "bn": {"name": "সঞ্চয়"},
  "ja": {"name": "貯金"}
}'::jsonb WHERE name = 'Savings' AND parent_id IS NULL;

-- Income categories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Salary & Wages"},
  "bn": {"name": "বেতন ও মজুরি"},
  "ja": {"name": "給与"}
}'::jsonb WHERE name = 'Salary & Wages' AND parent_id IS NULL;

-- New expense categories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Insurance"},
  "bn": {"name": "বীমা"},
  "ja": {"name": "保険"}
}'::jsonb WHERE name = 'Insurance' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Personal Care"},
  "bn": {"name": "ব্যক্তিগত যত্ন"},
  "ja": {"name": "美容"}
}'::jsonb WHERE name = 'Personal Care' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Family"},
  "bn": {"name": "পরিবার"},
  "ja": {"name": "家族"}
}'::jsonb WHERE name = 'Family' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Travel"},
  "bn": {"name": "ভ্রমণ"},
  "ja": {"name": "旅行"}
}'::jsonb WHERE name = 'Travel' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Home & Office"},
  "bn": {"name": "বাড়ি ও অফিস"},
  "ja": {"name": "ホーム・オフィス"}
}'::jsonb WHERE name = 'Home & Office' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Loans & Debt"},
  "bn": {"name": "ঋণ ও দেনা"},
  "ja": {"name": "ローン・負債"}
}'::jsonb WHERE name = 'Loans & Debt' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Tax"},
  "bn": {"name": "কর"},
  "ja": {"name": "税金"}
}'::jsonb WHERE name = 'Tax' AND parent_id IS NULL;

-- New income categories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Freelance & Consulting"},
  "bn": {"name": "ফ্রিল্যান্স ও পরামর্শ"},
  "ja": {"name": "フリーランス・コンサルティング"}
}'::jsonb WHERE name = 'Freelance & Consulting' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Business Income"},
  "bn": {"name": "ব্যবসায়িক আয়"},
  "ja": {"name": "事業収入"}
}'::jsonb WHERE name = 'Business Income' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Investments"},
  "bn": {"name": "বিনিয়োগ"},
  "ja": {"name": "投資"}
}'::jsonb WHERE name = 'Investments' AND parent_id IS NULL;

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Other Income"},
  "bn": {"name": "অন্যান্য আয়"},
  "ja": {"name": "その他の収入"}
}'::jsonb WHERE name = 'Other Income' AND parent_id IS NULL;

-- =============================================================================
-- Step 4: Update subcategories with translations
-- =============================================================================

-- Food And Drinks subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Groceries"},
  "bn": {"name": "কেনাকাটা"},
  "ja": {"name": "食料品"}
}'::jsonb WHERE name = 'Groceries';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Dining Out"},
  "bn": {"name": "বাইরে খাওয়া"},
  "ja": {"name": "外食"}
}'::jsonb WHERE name = 'Dining Out';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Coffee & Drinks"},
  "bn": {"name": "কফি ও পানীয়"},
  "ja": {"name": "コーヒー・飲み物"}
}'::jsonb WHERE name = 'Coffee & Drinks';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Fast Food"},
  "bn": {"name": "ফাস্ট ফুড"},
  "ja": {"name": "ファーストフード"}
}'::jsonb WHERE name = 'Fast Food';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Alcohol & Bars"},
  "bn": {"name": "মদ ও বার"},
  "ja": {"name": "アルコール・バース"}
}'::jsonb WHERE name = 'Alcohol & Bars';

-- Shopping subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Clothing & Accessories"},
  "bn": {"name": "পোশাক ও আনুসাঙ্গিক"},
  "ja": {"name": "衣類・アクセサリー"}
}'::jsonb WHERE name = 'Clothing & Accessories';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Electronics"},
  "bn": {"name": "ইলেকট্রনিক্স"},
  "ja": {"name": "電子機器"}
}'::jsonb WHERE name = 'Electronics';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Books & Stationery"},
  "bn": {"name": "বই ও স্টেশনারি"},
  "ja": {"name": "書籍・文房具"}
}'::jsonb WHERE name = 'Books & Stationery';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Online Shopping"},
  "bn": {"name": "অনলাইন কেনাকাটা"},
  "ja": {"name": "オンラインショッピング"}
}'::jsonb WHERE name = 'Online Shopping';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Home Goods"},
  "bn": {"name": "বাড়ির জিনিস"},
  "ja": {"name": "家庭用品"}
}'::jsonb WHERE name = 'Home Goods';

-- Healthcare subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Doctor & Hospital"},
  "bn": {"name": "ডাক্তার ও হাসপাতাল"},
  "ja": {"name": "医者・病院"}
}'::jsonb WHERE name = 'Doctor & Hospital';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Pharmacy"},
  "bn": {"name": "ফার্মেসি"},
  "ja": {"name": "薬局"}
}'::jsonb WHERE name = 'Pharmacy';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Dental"},
  "bn": {"name": "দন্ত চিকিৎসা"},
  "ja": {"name": "歯科"}
}'::jsonb WHERE name = 'Dental';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Gym & Fitness"},
  "bn": {"name": "জিম ও ফিটনেস"},
  "ja": {"name": "ジム・フィットネス"}
}'::jsonb WHERE name = 'Gym & Fitness';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Mental Health"},
  "bn": {"name": "মানসিক স্বাস্থ্য"},
  "ja": {"name": "メンタルヘルス"}
}'::jsonb WHERE name = 'Mental Health';

-- Transportation subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Fuel"},
  "bn": {"name": "জ্বালানি"},
  "ja": {"name": "燃料"}
}'::jsonb WHERE name = 'Fuel';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Public Transit"},
  "bn": {"name": "পাবলিক ট্রান্সপোর্ট"},
  "ja": {"name": "公共交通機関"}
}'::jsonb WHERE name = 'Public Transit';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Taxi & Ride Share"},
  "bn": {"name": "ট্যাক্সি ও রাইড শেয়ার"},
  "ja": {"name": "タクシー・ライドシェア"}
}'::jsonb WHERE name = 'Taxi & Ride Share';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Parking"},
  "bn": {"name": "পার্কিং"},
  "ja": {"name": "駐車場"}
}'::jsonb WHERE name = 'Parking';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Car Maintenance"},
  "bn": {"name": "গাড়ির রক্ষণাবেক্ষণ"},
  "ja": {"name": "車のメンテナンス"}
}'::jsonb WHERE name = 'Car Maintenance';

-- Entertainment subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Movies & Shows"},
  "bn": {"name": "সিনেমা ও শো"},
  "ja": {"name": "映画・ショー"}
}'::jsonb WHERE name = 'Movies & Shows';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Music"},
  "bn": {"name": "সঙ্গীত"},
  "ja": {"name": "音楽"}
}'::jsonb WHERE name = 'Music';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Sports & Games"},
  "bn": {"name": "ক্রীড়া ও গেমস"},
  "ja": {"name": "スポーツ・ゲーム"}
}'::jsonb WHERE name = 'Sports & Games';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Events & Concerts"},
  "bn": {"name": "অনুষ্ঠান ও কনসার্ট"},
  "ja": {"name": "イベント・コンサート"}
}'::jsonb WHERE name = 'Events & Concerts';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Subscriptions"},
  "bn": {"name": "সাবস্ক্রিপশন"},
  "ja": {"name": "サブスクリプション"}
}'::jsonb WHERE name = 'Subscriptions';

-- Bills & Utilities subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Electricity"},
  "bn": {"name": "বিদ্যুৎ"},
  "ja": {"name": "電気"}
}'::jsonb WHERE name = 'Electricity';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Water & Gas"},
  "bn": {"name": "পানি ও গ্যাস"},
  "ja": {"name": "ガス・水道"}
}'::jsonb WHERE name = 'Water & Gas';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Internet"},
  "bn": {"name": "ইন্টারনেট"},
  "ja": {"name": "インターネット"}
}'::jsonb WHERE name = 'Internet';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Phone Bill"},
  "bn": {"name": "ফোন বিল"},
  "ja": {"name": "電話代"}
}'::jsonb WHERE name = 'Phone Bill';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Rent & Mortgage"},
  "bn": {"name": "ভাড়া ও মর্টগেজ"},
  "ja": {"name": "家賃・モゲージ"}
}'::jsonb WHERE name = 'Rent & Mortgage';

-- Insurance subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Health Insurance"},
  "bn": {"name": "স্বাস্থ্য বীমা"},
  "ja": {"name": "医療保険"}
}'::jsonb WHERE name = 'Health Insurance';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Car Insurance"},
  "bn": {"name": "গাড়ি বীমা"},
  "ja": {"name": "自動車保険"}
}'::jsonb WHERE name = 'Car Insurance';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Life Insurance"},
  "bn": {"name": "জীবন বীমা"},
  "ja": {"name": "生命保険"}
}'::jsonb WHERE name = 'Life Insurance';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Home Insurance"},
  "bn": {"name": "বাড়ি বীমা"},
  "ja": {"name": "火災保険"}
}'::jsonb WHERE name = 'Home Insurance';

-- Personal Care subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Haircut & Salon"},
  "bn": {"name": "হেয়ারকাট ও স্যালুন"},
  "ja": {"name": "カット・美容院"}
}'::jsonb WHERE name = 'Haircut & Salon';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Beauty & Skincare"},
  "bn": {"name": "সৌন্দর্য ও ত্বকের যত্ন"},
  "ja": {"name": "ビューティー・スキンケア"}
}'::jsonb WHERE name = 'Beauty & Skincare';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Spa & Wellness"},
  "bn": {"name": "স্পা ও ওয়েলনেস"},
  "ja": {"name": "スパ・ウェルネス"}
}'::jsonb WHERE name = 'Spa & Wellness';

-- Family subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Kids & Baby"},
  "bn": {"name": "শিশু ও বাচ্চা"},
  "ja": {"name": "キッズ・ベビー"}
}'::jsonb WHERE name = 'Kids & Baby';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Education"},
  "bn": {"name": "শিক্ষা"},
  "ja": {"name": "教育"}
}'::jsonb WHERE name = 'Education';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Gifts & Donations"},
  "bn": {"name": "উপহার ও দান"},
  "ja": {"name": "ギフト・寄付"}
}'::jsonb WHERE name = 'Gifts & Donations';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Pet Care"},
  "bn": {"name": "পোষা প্রাণীর যত্ন"},
  "ja": {"name": "ペット用品"}
}'::jsonb WHERE name = 'Pet Care';

-- Travel subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Flights"},
  "bn": {"name": "বিমান টিকিট"},
  "ja": {"name": "フライト"}
}'::jsonb WHERE name = 'Flights';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Accommodation"},
  "bn": {"name": "থাকার জায়গা"},
  "ja": {"name": "宿泊"}
}'::jsonb WHERE name = 'Accommodation';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Activities & Tours"},
  "bn": {"name": "কার্যক্রম ও ট্যুর"},
  "ja": {"name": "アクティビティ・ツアー"}
}'::jsonb WHERE name = 'Activities & Tours';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Local Transport Abroad"},
  "bn": {"name": "বিদেশে স্থানীয় পরিবহন"},
  "ja": {"name": "現地の交通費"}
}'::jsonb WHERE name = 'Local Transport Abroad';

-- Home & Office subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Furniture"},
  "bn": {"name": "আসবাবপত্র"},
  "ja": {"name": "家具"}
}'::jsonb WHERE name = 'Furniture';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Home Appliances"},
  "bn": {"name": "বাড়ির যন্ত্রপাতি"},
  "ja": {"name": "家電製品"}
}'::jsonb WHERE name = 'Home Appliances';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Office Supplies"},
  "bn": {"name": "অফিস সামগ্রী"},
  "ja": {"name": "事務用品"}
}'::jsonb WHERE name = 'Office Supplies';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Repairs & Maintenance"},
  "bn": {"name": "মেরামত ও রক্ষণাবেক্ষণ"},
  "ja": {"name": "修理・メンテナンス"}
}'::jsonb WHERE name = 'Repairs & Maintenance';

-- Loans & Debt subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Personal Loan"},
  "bn": {"name": "ব্যক্তিগত ঋণ"},
  "ja": {"name": "個人ローン"}
}'::jsonb WHERE name = 'Personal Loan';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Student Loan"},
  "bn": {"name": "ছাত্র ঋণ"},
  "ja": {"name": "学生ローン"}
}'::jsonb WHERE name = 'Student Loan';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Credit Card Payment"},
  "bn": {"name": "ক্রেডিট কার্ড পেমেন্ট"},
  "ja": {"name": "クレジットカード支払い"}
}'::jsonb WHERE name = 'Credit Card Payment';

-- Tax subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Income Tax"},
  "bn": {"name": "আয়কর"},
  "ja": {"name": "所得税"}
}'::jsonb WHERE name = 'Income Tax';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "GST/VAT"},
  "bn": {"name": "জিএসটি/ভ্যাট"},
  "ja": {"name": "消費税"}
}'::jsonb WHERE name = 'GST/VAT';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Property Tax"},
  "bn": {"name": "সম্পত্তি কর"},
  "ja": {"name": "固定資産税"}
}'::jsonb WHERE name = 'Property Tax';

-- Other subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Miscellaneous"},
  "bn": {"name": "বিবিধ"},
  "ja": {"name": "その他"}
}'::jsonb WHERE name = 'Miscellaneous';

-- Salary & Wages subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Primary Salary"},
  "bn": {"name": "মূল বেতন"},
  "ja": {"name": "給与"}
}'::jsonb WHERE name = 'Primary Salary';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Bonus & Commission"},
  "bn": {"name": "বোনাস ও কমিশন"},
  "ja": {"name": "ボーナス・インセンティブ"}
}'::jsonb WHERE name = 'Bonus & Commission';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Overtime"},
  "bn": {"name": "ওভারটাইম"},
  "ja": {"name": "残業代"}
}'::jsonb WHERE name = 'Overtime';

-- Freelance & Consulting subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Consulting"},
  "bn": {"name": "পরামর্শ"},
  "ja": {"name": "コンサルティング"}
}'::jsonb WHERE name = 'Consulting';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Projects"},
  "bn": {"name": "প্রজেক্ট"},
  "ja": {"name": "プロジェクト"}
}'::jsonb WHERE name = 'Projects';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Side Gigs"},
  "bn": {"name": "সাইড গিগ"},
  "ja": {"name": "副業"}
}'::jsonb WHERE name = 'Side Gigs';

-- Business Income subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Revenue"},
  "bn": {"name": "রাজস্ব"},
  "ja": {"name": "収益"}
}'::jsonb WHERE name = 'Revenue';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Royalties"},
  "bn": {"name": "রয়ালটি"},
  "ja": {"name": "ロイヤリティ"}
}'::jsonb WHERE name = 'Royalties';

-- Investments subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Dividends"},
  "bn": {"name": "লভ্যাংশ"},
  "ja": {"name": "配当金"}
}'::jsonb WHERE name = 'Dividends';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Capital Gains"},
  "bn": {"name": "মূলধন লাভ"},
  "ja": {"name": "キャピタルゲイン"}
}'::jsonb WHERE name = 'Capital Gains';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Interest"},
  "bn": {"name": "সুদ"},
  "ja": {"name": "利息"}
}'::jsonb WHERE name = 'Interest';

-- Other Income subcategories
UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Gifts Received"},
  "bn": {"name": "প্রাপ্ত উপহার"},
  "ja": {"name": "贈り物"}
}'::jsonb WHERE name = 'Gifts Received';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Tax Refunds"},
  "bn": {"name": "কর রিফান্ড"},
  "ja": {"name": "退税"}
}'::jsonb WHERE name = 'Tax Refunds';

UPDATE public.categories SET translations = translations || '{
  "en": {"name": "Awards & Prizes"},
  "bn": {"name": "পুরস্কার ও পুরস্কারা"},
  "ja": {"name": "賞金・賞品"}
}'::jsonb WHERE name = 'Awards & Prizes';

-- =============================================================================
-- Step 5: Create helper function to get localized name
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_category_name(p_category_id UUID, p_locale TEXT DEFAULT 'en')
RETURNS TEXT LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_name TEXT;
  v_translations JSONB;
BEGIN
  -- First try to get translation from JSONB column
  SELECT translations->p_locale->>'name' INTO v_name
  FROM public.categories
  WHERE id = p_category_id;
  
  -- If translation exists, return it
  IF v_name IS NOT NULL AND v_name <> '' THEN
    RETURN v_name;
  END IF;
  
  -- Fall back to default name (English)
  SELECT name INTO v_name
  FROM public.categories
  WHERE id = p_category_id;
  
  RETURN v_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_category_name TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_category_name TO anon;
