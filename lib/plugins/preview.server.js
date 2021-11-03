var detect = function(context, parameterName, headerName, cookieName)
{
  return context.query[parameterName];
};

export default function (context) {
  
  // repository
  var repositoryId = detect(context, "repository");
  if (!repositoryId) {
    if (context.env) {
      repositoryId = context.env.repositoryId;
    }
  }
  if (!repositoryId) {
    repositoryId = process.env.repositoryId;
  }
  
  // branch
  var branchId = detect(context, "branch");
  if (!branchId) {
    if (context.env) {
      branchId = context.env.branchId;
    }
  }
  if (!branchId) {
    branchId = process.env.branchId;
  }
  
  context.repositoryId = repositoryId;
  context.branchId = branchId;
  
};
