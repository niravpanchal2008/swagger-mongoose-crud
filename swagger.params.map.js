// Purpose : map every key to its value

var map = (req) =>{
    if(req.operationDoc){
        var params={}
        req.operationDoc.parameters.forEach(element=>{
           switch(element.in){
               case 'body':{
                params[element.name]=req.body
                break;
               }
               case 'query':{
                if(req.query[element.name])
                  params[element.name]=req.query[element.name]
                break;
               }
               case 'path':{
                if(req.params[element.name])
                    params[element.name]=req.params[element.name]
                break;
               }
           }
        })
        return params
    }else{
        return  Object.keys(req.swagger.params).reduce((prev, curr) => {
                    prev[curr] = req.swagger.params[curr];
                    return prev;
                }, {});
    }
}

module.exports = { map: map };
