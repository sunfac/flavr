interface LoadingProps {
  message?: string;
}

export default function Loading({ message = "Loading..." }: LoadingProps) {
  return (
    <div className="fixed inset-0 bg-background bg-opacity-90 flex flex-col items-center justify-center z-50">
      <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
      <h3 className="text-lg font-medium text-foreground mb-2 font-playfair">
        {message.includes("Creating") || message.includes("Finding") || message.includes("Loading") ? message : "Creating your perfect recipe..."}
      </h3>
      <p className="text-muted-foreground text-center px-8 max-w-md">
        {message.includes("profile") ? "Getting your account information..." :
         message.includes("ingredients") ? "Our AI chef is analyzing your ingredients and finding the best combinations." :
         message.includes("bespoke") ? "Crafting a personalized culinary experience tailored to your exact specifications." :
         message.includes("settings") ? "Loading your preferences and account details..." :
         message.includes("subscription") ? "Preparing your Flavr+ upgrade options..." :
         "Our AI chef is analyzing your preferences and crafting something delicious just for you."}
      </p>
    </div>
  );
}
