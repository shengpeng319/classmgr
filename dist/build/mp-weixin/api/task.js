"use strict";const e=require("../utils/request.js");exports.generateDailyTasks=function(){return e.request({url:"/admin/tasks/generate-daily",method:"POST"})};
