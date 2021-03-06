'use strict';
const md5 = require('md5');
const BaseController = require('./base.js');
class IndexController extends BaseController {
  async index() {
    await this.succ();
  }
  async doLogin() {
    const { username, password } = this.ctx.request.body;
    const pwd = md5(password);
    let user = await this.ctx.model.User.findOne({ username });
    if (user) {
      console.log(user, user.pwd, pwd);
      if (user.pwd === pwd) {
        const sUser = user.toObject();
        delete sUser.pwd;
        this.ctx.session.user = sUser;
        console.log(sUser);
        await this.succ();
      } else {
        this.fail('用户名或密码错误');
      }
    } else {
      user = new this.ctx.model.User({
        username,
        pwd,
      });
      await user.save();
      await this.succ({
        isCreate: true,
      });
    }
  }
  async logout() {
    this.ctx.session.user = null;
    this.succ({}, true);
  }
  async home() {
    // 获取banner信息
    const banner = await this.groupByBanner('homeSwipe', 1);

    // 按商品风格查询商品
    const style = await this.ctx.model.Attr.findOne({
      attr_name: 'myStyle',
    });
    const arr = style.attr_val.split(',');
    // 按风格分类商品展示
    const proTypes = [];
    arr.forEach(async sub => {
      const obj = {
        name: sub,
      };
      obj.products = await this.ctx.model.Product.find({
        'props.myStyle': sub,
      });
      proTypes.push(obj);
    });
    //
    // 查询Vr数据列表

    await this.succ({
      proTypes,
      banner,
    });
  }
  async product() {
    let { page, pageSize, type, subType, subNodeType, myStyle, brand, attr } = this.ctx.request.query;
    page = parseInt(page || 1);
    pageSize = parseInt(pageSize || 20);
    const catePath = subNodeType || subType || type;
    // 查询product分类
    const res = await this.treeByName('product');
    // 获取产品风格属性
    const style = await this.ctx.model.Attr.findOne({
      attr_name: 'myStyle',
    });
    // 查询产品属性开关类型
    const attrs = await this.ctx.model.Attr.find({
      attr_type: 'switch',
    });
    // 查询产品品牌
    const brands = await this.ctx.model.Brand.find({});
    // 获取全部产品
    // const mongoose = this.app.mongoose;
    const findParams = { on_sale: 1 };
    if (myStyle) {
      findParams['props.myStyle'] = myStyle;
    }
    if (brand) {
      findParams.brand_id = brand;
    }
    if (catePath) {
      findParams.category_path = new RegExp('^' + catePath);
    }
    if (attr) {
      findParams['props.' + attr] = '1';
    }
    const pageTotal = await this.ctx.model.Product.count(findParams);
    const products = await this.ctx.model.Product.find(findParams).skip((page - 1) * +pageSize).limit(+pageSize);
    await this.succ({
      page,
      pageSize,
      pageTotal,
      style,
      brands,
      attrs,
      types: res,
      list: products,
    });
  }
  async productDetail() {
    const id = this.ctx.request.query.id;
    // 查询商品
    const product = await this.ctx.model.Product.findById(id);
    const category = await this.ctx.model.Category.findById(product.category_id);
    const pro = product.toObject();
    pro.category = category;
    // 查询商品所在分类
    await this.succ({
      info: pro,
    });
  }
  async page() {
    const id = this.ctx.request.query.id;
    const cate = await this.ctx.model.Category.findById(id);
    const page = await this.ctx.model.Page.findById(cate.other_id);
    await this.succ({
      cate,
      info: page,
    });
  }
  async pageById() {
    const id = this.ctx.request.query.id;
    const page = await this.ctx.model.Page.findById(id);
    let pageGroup;
    if (page.group_id) {
      pageGroup = await this.ctx.model.PageGroup.findById(page.group_id);
    }
    await this.succ({
      nav: pageGroup,
      info: page,
    });
  }
  async pageList() {
    const id = this.ctx.request.query.id;
    const cate = await this.ctx.model.Category.findById(id);
    const pageGroup = await this.ctx.model.PageGroup.findById(cate.other_id);
    const pages = await this.ctx.model.Page.find({ group_id: pageGroup._id });
    await this.succ({
      list: pages,
      cate,
      nav: pageGroup,
    });
  }
  async brand() {
    const brands = await this.ctx.model.Brand.find({});
    await this.succ({
      list: brands,
    });
  }
}

module.exports = IndexController;
