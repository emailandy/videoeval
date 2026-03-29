export interface ABCCategory {
  id: 'attract' | 'brand' | 'connect' | 'direct';
  name: string;
  color: string;
  features: string[];
}

export const ABCD_CATEGORIES: ABCCategory[] = [
  {
    id: 'attract',
    name: 'Attract',
    color: 'bg-blue-500',
    features: [
      'shorts_production_style',
      'shorts_tv_ad_style',
      'shorts_sfv_adaptation_low',
      'shorts_sfv_adaptation_medium',
      'shorts_sfv_adaptation_high',
      'shorts_transitions',
      'shorts_gap_utilization',
      'shorts_traditional_ad',
      'shorts_video_format',
      'shorts_micro_trend',
      'shorts_meso_trend',
      'shorts_macro_trend'
    ]
  },
  {
    id: 'brand',
    name: 'Brand',
    color: 'bg-purple-500',
    features: [
      'shorts_product_result',
      'shorts_product_context',
      'shorts_native_brand_context',
      'shorts_creator_name_mention',
      'shorts_partnership_disclosure'
    ]
  },
  {
    id: 'connect',
    name: 'Connect',
    color: 'bg-green-500',
    features: [
      'shorts_emoji_usage',
      'shorts_personal_character_talk',
      'shorts_personal_character_type',
      'shorts_partial_social',
      'shorts_mostly_social'
    ]
  },
  {
    id: 'direct',
    name: 'Direct',
    color: 'bg-red-500',
    features: [
      'shorts_call_to_action'
    ]
  }
];

export const getFeatureCategory = (featureId: string): ABCCategory | undefined => {
  return ABCD_CATEGORIES.find(cat => cat.features.includes(featureId));
};

export const formatFeatureName = (id: string) => {
  if (!id) return "";
  return id
    .replace("shorts_", "")
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
