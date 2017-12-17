module.exports = function(){
    switch(process.env.NODE_ENV){
        case 'test':
            return {
              'secret': '04050405',
              'database': 'mongodb://localhost:27018/backoffice_integration_test',
              'logsDirectory': 'logs',
              'tokenExpiryMinutes' : 10,
              'serviceName': 'backofficeservice'
            };
        default:
            return {
              'secret': '04050405',
              'database': 'mongodb://microservices_backofficemongo:27018/backofficeuser',
              'logsDirectory': 'logs',
              'tokenExpiryMinutes' : 1,
              'serviceName': 'backofficeservice'
            };
    }
};
