// 企业服务认证服务商库
export interface ServiceProvider {
  id: string;
  service: string;      // 服务类型 key
  name: string;         // 服务商名
  rating: number;       // 评分
  orders: number;       // 成单数
  tags: string[];       // 标签
  price: string;        // 起价
  certified: boolean;
}

export const PROVIDERS: Record<string, ServiceProvider[]> = {
  food: [
    { id: 'p1', service: 'food', name: '园区中央厨房', rating: 4.8, orders: 1280, tags: ['自营食堂', '工作餐', '团餐'], price: '15元/餐起', certified: true },
    { id: 'p2', service: 'food', name: '美餐网企业版', rating: 4.6, orders: 860, tags: ['外卖聚合', '多人拼单'], price: '20元/餐起', certified: true },
    { id: 'p3', service: 'food', name: '饿了么企业餐', rating: 4.5, orders: 2100, tags: ['企业账户', '月结'], price: '18元/餐起', certified: true },
  ],
  print: [
    { id: 'p4', service: 'print', name: '快印先生', rating: 4.7, orders: 540, tags: ['彩色打印', '装订', '送货上门'], price: '0.1元/张起', certified: true },
    { id: 'p5', service: 'print', name: '图文快印中心', rating: 4.5, orders: 320, tags: ['标书装订', '海报'], price: '0.15元/张起', certified: true },
  ],
  law: [
    { id: 'p6', service: 'law', name: '中银律所企业组', rating: 4.9, orders: 180, tags: ['合同审查', '劳动纠纷', '公司治理'], price: '500元/次起', certified: true },
    { id: 'p7', service: 'law', name: '盈科产业园法务', rating: 4.7, orders: 210, tags: ['租赁合同', '知识产权'], price: '300元/次起', certified: true },
  ],
  hammer: [
    { id: 'p8', service: 'hammer', name: '居联装饰工装部', rating: 4.6, orders: 430, tags: ['厂房装修', '办公装修', '消防改造'], price: '350元/㎡起', certified: true },
    { id: 'p9', service: 'hammer', name: '金螳螂公装', rating: 4.8, orders: 290, tags: ['高端办公', '展厅'], price: '600元/㎡起', certified: true },
  ],
  clip: [
    { id: 'p10', service: 'clip', name: '震坤行工业品', rating: 4.7, orders: 1500, tags: ['MRO采购', '次日达', '企业月结'], price: '市场价8折', certified: true },
    { id: 'p11', service: 'clip', name: '京东企业购', rating: 4.8, orders: 3200, tags: ['全品类', '发票', '对公'], price: '市场价9折', certified: true },
  ],
  truck: [
    { id: 'p12', service: 'truck', name: '货拉拉企业版', rating: 4.6, orders: 2800, tags: ['同城货运', '企业账户'], price: '30元/趟起', certified: true },
    { id: 'p13', service: 'truck', name: '京东物流仓储', rating: 4.8, orders: 540, tags: ['云仓', '代发'], price: '按量计费', certified: true },
  ],
  briefcase: [
    { id: 'p14', service: 'briefcase', name: '企查查企服', rating: 4.7, orders: 670, tags: ['公司注册', '变更', '注销'], price: '500元起', certified: true },
    { id: 'p15', service: 'briefcase', name: '快办通工商', rating: 4.5, orders: 420, tags: ['加急注册', '地址挂靠'], price: '800元起', certified: true },
  ],
  money: [
    { id: 'p16', service: 'money', name: '慧算账代账', rating: 4.7, orders: 980, tags: ['代理记账', '报税', '年报'], price: '200元/月起', certified: true },
    { id: 'p17', service: 'money', name: '用友畅捷通', rating: 4.8, orders: 1200, tags: ['财税软件', '进销存'], price: '免费试用', certified: true },
  ],
  flask: [
    { id: 'p18', service: 'flask', name: '中检集团认证', rating: 4.8, orders: 230, tags: ['环评', '消防', 'ISO认证'], price: '3000元起', certified: true },
    { id: 'p19', service: 'flask', name: 'SGS检测', rating: 4.9, orders: 180, tags: ['产品检测', 'RoHS'], price: '按项报价', certified: true },
  ],
  wifi: [
    { id: 'p20', service: 'wifi', name: '联通企业宽带', rating: 4.5, orders: 1100, tags: ['专线', '固定IP'], price: '199元/月起', certified: true },
    { id: 'p21', service: 'wifi', name: '电信商务专线', rating: 4.6, orders: 890, tags: ['千兆', 'SLA保障'], price: '299元/月起', certified: true },
  ],
  battery: [
    { id: 'p22', service: 'battery', name: '电力工程服务商', rating: 4.6, orders: 160, tags: ['增容改造', '配电房'], price: '现场报价', certified: true },
    { id: 'p23', service: 'battery', name: '国家电网合作商', rating: 4.8, orders: 95, tags: ['正式报装', '验收'], price: '按容量', certified: true },
  ],
  car: [
    { id: 'p24', service: 'car', name: '园区停车管理', rating: 4.4, orders: 5000, tags: ['月卡', '临停', '充电桩'], price: '300元/月起', certified: true },
    { id: 'p25', service: 'car', name: 'ETCP智慧停车', rating: 4.5, orders: 3200, tags: ['无感支付', '电子发票'], price: '按次', certified: true },
  ],
};

export const SERVICE_LABELS: Record<string, string> = {
  food: '订餐', print: '文印', law: '法务', hammer: '装修', clip: '办公用品',
  truck: '物流', briefcase: '工商注册', money: '财税', flask: '检测认证',
  wifi: '网络宽带', battery: '电力增容', car: '停车',
};
