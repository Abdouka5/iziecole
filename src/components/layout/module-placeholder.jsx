import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ModulePlaceholder({ title, description, specRef }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>{description}</p>
        {specRef ? (
          <p className="text-xs">
            Voir <code>docs/cahier-des-charges.md</code> — {specRef}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
